import {onCleanup, createEffect, onMount, Switch, Match, ErrorBoundary} from 'solid-js'
import {createMutable} from 'solid-js/store'
import * as tauriWindow from '@tauri-apps/api/window'
import {Mode, State, StateContext} from '@/state'
import {createCtrl} from '@/services'
import * as remote from '@/remote'
import {isTauri} from '@/env'
import {Layout} from '@/components/Layout'
import {Editor} from '@/components/editor/Editor'
import {CodeEditor} from '@/components/code/CodeEditor'
import {Canvas} from '@/components/canvas/Canvas'
import {Menu} from '@/components/menu/Menu'
import {Error} from '@/components/Error'
import {Dir} from '@/components/Dir'
import {Keymap} from '@/components/Keymap'
import {Variables} from '@/components/Variables'
import {MouseCursor} from '@/components/MouseCursor'
import {InputLine} from '@/components/dialog/InputLine'

export const Main = (props: {state: State}) => {
  const {store, ctrl} = createCtrl(props.state)
  const mouseEnterCoords = createMutable({x: 0, y: 0})
  const [inputLine, setInputLine] = ctrl.app.inputLine

  let layoutRef!: HTMLDivElement

  const onDragOver = (e: DragEvent) => {
    mouseEnterCoords.x = e.pageX
    mouseEnterCoords.y = e.pageY
  }

  const onViewError = (error: any, reset: any) => {
    ctrl.app.setError({error})
    reset()
    return <></>
  }

  onMount(() => {
    ctrl.app.layoutRef = layoutRef
    const matchDark = window.matchMedia('(prefers-color-scheme: dark)')
    const onUpdateDarkMode = () => ctrl.config.updateDarkMode()
    matchDark.addEventListener('change', onUpdateDarkMode)
    onCleanup(() => matchDark.removeEventListener('change', onUpdateDarkMode))
  })

  onMount(() => {
    if (!isTauri()) return
    const unlistenProm = tauriWindow.getCurrentWindow().onDragDropEvent(async (event) => {
      if (event.payload.type === 'over') {
        remote.info('🔗 User hovering')
      } else if (event.payload.type === 'drop') {
        remote.info('🔗 User dropped')
        for (const path of event.payload.paths) {
          const {x, y} = event.payload.position
          await ctrl.media.dropPath(path, [x, y])
        }
      } else {
        remote.info('🔗 File drop cancelled')
      }
    })

    onCleanup(async () => (await unlistenProm)())
  })

  onMount(() => {
    if (!isTauri()) return
    const unlistenResizeProm = tauriWindow.getCurrentWindow().onResized(async ({payload}) => {
      const {width, height} = payload
      await ctrl.app.updateWindow({width, height})
    })

    const unlistenMoveProm = tauriWindow.getCurrentWindow().onMoved(async ({payload}) => {
      const {x, y} = payload
      await ctrl.app.updateWindow({x, y})
    })

    onCleanup(async () => {
      ;(await unlistenResizeProm)()
      ;(await unlistenMoveProm)()
    })
  })

  onMount(async () => {
    await ctrl.app.init()
  })

  onMount(() => {
    if (isTauri()) return
    const onDrop = async (e: DragEvent) => {
      e.preventDefault()

      // don't drop files in codemirror
      if ((e.target as Element).closest('.cm-editor')) {
        return
      }

      for (const file of e.dataTransfer?.files ?? []) {
        if (file.type.startsWith('image/')) {
          const x = mouseEnterCoords.x
          const y = mouseEnterCoords.y
          await ctrl.media.dropFile(file, [x, y])
        }
      }
    }

    const onDragOver = (e: DragEvent) => e.preventDefault()

    window.addEventListener('drop', onDrop, false)
    window.addEventListener('dragover', onDragOver, false)

    onCleanup(() => {
      window.removeEventListener('drop', onDrop, false)
      window.removeEventListener('dragover', onDragOver, false)
    })
  })

  createEffect(() => {
    if (!store.collab?.rendered) return

    if (store.mode === Mode.Canvas) {
      document.title = 'Canvas'
      return
    }

    const currentFile = ctrl.file.currentFile
    if (!currentFile?.lastModified) return
    const doc = currentFile?.editorView?.state.doc
    const len = doc?.content.size ?? 0
    if (len > 0) {
      const text = doc?.textBetween(0, Math.min(30, len), ' ') ?? ''
      document.title = text
    }
  })

  return (
    <StateContext.Provider value={[store, ctrl]}>
      <ErrorBoundary fallback={onViewError}>
        <Layout
          ref={layoutRef}
          onDragOver={onDragOver}
          data-testid={store.error ? 'error' : store.loading}
        >
          <Switch>
            <Match when={store.error}>
              <Error />
            </Match>
            <Match when={store.args?.dir}>
              <Dir />
            </Match>
            <Match when={store.mode === Mode.Canvas}>
              <Canvas />
            </Match>
            <Match when={store.mode === Mode.Editor}>
              <Editor />
            </Match>
            <Match when={store.mode === Mode.Code}>
              <CodeEditor />
            </Match>
          </Switch>
          <MouseCursor />
          <Menu />
          <Keymap />
          <Variables />
          <InputLine getter={inputLine} setter={setInputLine} />
        </Layout>
      </ErrorBoundary>
    </StateContext.Provider>
  )
}
