import {Show, onCleanup, createEffect, onError, onMount, untrack} from 'solid-js'
import {createMutable, unwrap} from 'solid-js/store'
import {EditorView} from 'prosemirror-view'
import {listen} from '@tauri-apps/api/event'
import {convertFileSrc} from '@tauri-apps/api/tauri'
import {injectGlobal} from '@emotion/css'
import {State, StateContext} from './state'
import {createCtrl} from './ctrl'
import * as remote from './remote'
import {isTauri} from './env'
import {fonts} from './config'
import {Layout} from './components/Layout'
import Editor from './components/Editor'
import Menu from './components/Menu'
import ErrorView from './components/Error'
import {insertImage} from './prosemirror/extension/image'
import {createEmptyState} from './prosemirror'

const fontsStyles = Object.entries(fonts)
  .filter(([, value]) => value.src)
  .map(([, value]) => ({
    '@font-face': {
      fontFamily: `'${value.label}'`,
      src: `url('${value.src}')`,
    },
  }))

injectGlobal(fontsStyles)

export default (props: {state: State}) => {
  const [store, ctrl] = createCtrl(props.state)
  const mouseEnterCoords = createMutable({x: 0, y: 0})

  const editorView = (): EditorView =>
    untrack(() => unwrap(store.editorView))

  const onReady = () =>
    store.loading === 'initialized' &&
    store.error === undefined

  const isReady = () => untrack(onReady)

  const onMouseEnter = (e: any) => {
    mouseEnterCoords.x = e.pageX
    mouseEnterCoords.y = e.pageY
  }

  onMount(async () => {
    if (store.error) return
    try {
      let data = await ctrl.fetchData()
      if (data.args.room) {
        data = ctrl.startCollab(data)
      } else if (data.args.text) {
        data = await ctrl.doOpenFile(data, {text: JSON.parse(data.args.text)})
      } else if (data.args.file && data.args.file === data.path) {
        const file = await ctrl.loadFile(data.config, data.path)
        data = await ctrl.doOpenFile(data, file)
      } else if (data.args.file) {
        data = await ctrl.doOpenFile(data, {path: data.args.file})
      } else if (!data.text) {
        const [text, extensions] = createEmptyState({
          config: data.config ?? store.config,
          markdown: data.markdown ?? store.markdown,
          keymap: ctrl.keymap,
        })
        data = {...data, text, extensions}
      }

      data = {...data, ...ctrl.getTheme(data)}
      ctrl.setState({...data, loading: 'initialized'})
    } catch (error: any) {
      ctrl.setState({error: error.errorObject})
    }
  })

  onMount(() => {
    const matchDark = () => window.matchMedia('(prefers-color-scheme: dark)')
    const onChangeTheme = () => {
      ctrl.setState({
        config: {...store.config, ...ctrl.getTheme(unwrap(store))}
      })
    }

    matchDark().addEventListener('change', onChangeTheme)
    onCleanup(() => matchDark().removeEventListener('change', onChangeTheme))
  })

  onMount(async () => {
    if (!isTauri) return
    const unlisten = await listen('tauri://file-drop', async (event: any) => {
      for (const path of (event.payload as string[])) {
        const mime = await remote.getMimeType(path)
        if (mime.startsWith('image/')) {
          const x = mouseEnterCoords.x
          const y = mouseEnterCoords.y
          insertImage(editorView(), convertFileSrc(path), x, y)
        } else if (mime.startsWith('text/')) {
          const state: State = unwrap(store)
          const file = await ctrl.loadFile(state.config, path)
          await ctrl.openFile(file)
          return
        }
      }
    })

    onCleanup(() => unlisten())
  })

  onError((error) => {
    console.error(error)
    ctrl.setState({
      error: {id: 'exception', props: {error}}
    })
  })

  // Save state in DB if lastModified has changed
  createEffect(() => {
    const lastModified = store.lastModified
    if (!isReady() || !lastModified) return
    const state: State = untrack(() => unwrap(store))
    ctrl.saveState(state)
  })

  return (
    <StateContext.Provider value={[store, ctrl]}>
      <Layout
        config={store.config}
        data-testid={store.error ? 'error' : store.loading}
        onMouseEnter={onMouseEnter}>
        <Show when={store.error}><ErrorView /></Show>
        <Show when={store.loading === 'initialized'}>
          <Show when={!store.error}><Editor /></Show>
          <Menu />
        </Show>
      </Layout>
    </StateContext.Provider>
  )
}
