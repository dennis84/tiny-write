import {onCleanup, createEffect, onMount, Switch, Match, ErrorBoundary} from 'solid-js'
import {createMutable} from 'solid-js/store'
import * as tauriWindow from '@tauri-apps/api/window'
import * as webview from '@tauri-apps/api/webview'
import {Mode, State, StateContext} from '@/state'
import {createCtrl} from '@/services'
import * as remote from '@/remote'
import {isTauri} from '@/env'
import {Layout} from '@/components/Layout'
import {Editor} from '@/components/editor/Editor'
import {CodeEditor} from '@/components/code/CodeEditor'
import {BlockTooltip} from '@/components/editor/BlockTooltip'
import {Canvas} from '@/components/canvas/Canvas'
import {Menu} from '@/components/menu/Menu'
import {Error} from '@/components/Error'
import {Dir} from '@/components/Dir'
import {Keymap} from '@/components/Keymap'
import {Variables} from '@/components/Variables'
import {MouseCursor} from '@/components/MouseCursor'

export const Main = (props: {state: State}) => {
  const {store, ctrl} = createCtrl(props.state)
  const mouseEnterCoords = createMutable({x: 0, y: 0})
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
    const unlistenProm = webview.getCurrent().onDragDropEvent(async (event) => {
      if (event.payload.type === 'dragOver') {
        remote.info('🔗 User hovering')
      } else if (event.payload.type === 'dropped') {
        remote.info('🔗 User dropped')
        for (const path of event.payload.paths) {
          await ctrl.media.dropPath(path, [mouseEnterCoords.x, mouseEnterCoords.y])
        }
      } else {
        remote.info('🔗 File drop cancelled')
      }
    })

    onCleanup(async () => (await unlistenProm)())
  })

  onMount(() => {
    if (!isTauri()) return
    const unlistenResizeProm = tauriWindow.getCurrent().onResized(async ({payload}) => {
      const {width, height} = payload
      await ctrl.app.updateWindow({width, height})
    })

    const unlistenMoveProm = tauriWindow.getCurrent().onMoved(async ({payload}) => {
      const {x, y} = payload
      await ctrl.app.updateWindow({x, y})
    })

    onCleanup(async () => {
      (await unlistenResizeProm)();
      (await unlistenMoveProm)()
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
          console.log('aaaaa')
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
          data-testid={store.error ? 'error' : store.loading}
          onDragOver={onDragOver}>
          <Switch>
            <Match when={store.error}><Error /></Match>
            <Match when={store.args?.dir}><Dir /></Match>
            <Match when={store.mode === Mode.Canvas}><Canvas /></Match>
            <Match when={store.mode === Mode.Editor}><Editor /></Match>
            <Match when={store.mode === Mode.Code}><CodeEditor /></Match>
          </Switch>
          <BlockTooltip />
          <MouseCursor />
          <Menu />
          <Keymap />
          <Variables />
        </Layout>
      </ErrorBoundary>
    </StateContext.Provider>
  )
}
