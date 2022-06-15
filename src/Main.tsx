import {Show, onCleanup, createEffect, onError, onMount, untrack} from 'solid-js'
import {createMutable, unwrap} from 'solid-js/store'
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

  const onDragOver = (e: any) => {
    mouseEnterCoords.x = e.pageX
    mouseEnterCoords.y = e.pageY
  }

  onMount(async () => {
    if (store.error) return
    await ctrl.init()
  })

  onMount(() => {
    const matchDark = () => window.matchMedia('(prefers-color-scheme: dark)')
    const onChangeTheme = () => ctrl.updateTheme()
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
          insertImage(store.editorView, convertFileSrc(path), x, y)
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

  onMount(async () => {
    if (isTauri) return
    const onDrop = (e) => {
      e.preventDefault()
      if (e.target.closest('.codemirror-outer')) {
        return
      }

      for (const file of e.dataTransfer.files) {
        if (file.type.startsWith('image/')) {
          const x = mouseEnterCoords.x
          const y = mouseEnterCoords.y
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.onloadend = function() {
            insertImage(store.editorView, reader.result as string, x, y)
          }
        }
      }
    }

    window.addEventListener('drop', onDrop)
    onCleanup(() => {
      window.removeEventListener('drop', onDrop)
    })
  })

  onError((error) => {
    console.error(error)
    ctrl.setState({
      error: {id: 'exception', props: {error}}
    })
  })

  createEffect(() => {
    if (!store.lastModified) return
    const doc = store.editorView?.state.doc
    const len = doc?.content.size
    if (len > 0) {
      const text = doc.textBetween(0, Math.min(30, len), ' ')
      document.title = text
    }
  })

  createEffect((prev) => {
    const lastModified = store.lastModified
    if (!lastModified || (store.loading === 'initialized' && prev === 'loading')) {
      return store.loading
    }

    const state: State = untrack(() => unwrap(store))
    ctrl.saveState(state)
    return store.loading
  }, store.loading)

  return (
    <StateContext.Provider value={[store, ctrl]}>
      <Layout
        config={store.config}
        data-testid={store.error ? 'error' : store.loading}
        onDragOver={onDragOver}>
        <Show when={store.error}><ErrorView /></Show>
        <Show when={store.loading === 'initialized'}>
          <Show when={!store.error}><Editor /></Show>
          <Menu />
        </Show>
      </Layout>
    </StateContext.Provider>
  )
}
