import {onCleanup, createEffect, onMount, Switch, Match, ErrorBoundary} from 'solid-js'
import {createMutable} from 'solid-js/store'
import {appWindow} from '@tauri-apps/api/window'
import {WheelGesture} from '@use-gesture/vanilla'
import {Mode, State, StateContext} from '@/state'
import {createCtrl} from '@/services'
import * as remote from '@/remote'
import {isTauri} from '@/env'
import {Scroll, Layout} from '@/components/Layout'
import {Editor} from '@/components/editor/Editor'
import {BlockTooltip} from '@/components/editor/BlockTooltip'
import Canvas from '@/components/canvas/Canvas'
import Menu from '@/components/menu/Menu'
import ErrorView from '@/components/Error'
import Dir from '@/components/Dir'
import Keymap from '@/components/Keymap'
import Variables from '@/components/Variables'
import MouseCursor from '@/components/MouseCursor'
import Select from '@/components/Select'

export default (props: {state: State}) => {
  const {store, ctrl} = createCtrl(props.state)
  const mouseEnterCoords = createMutable({x: 0, y: 0})
  let editorRef!: HTMLDivElement
  let scrollRef!: HTMLDivElement
  let layoutRef!: HTMLDivElement

  const onDragOver = (e: DragEvent) => {
    mouseEnterCoords.x = e.pageX
    mouseEnterCoords.y = e.pageY
  }

  const onViewError = (e: any, reset: any) => {
    ctrl.app.setError(e)
    reset()
    return <></>
  }

  onMount(() => {
    ctrl.app.layoutRef = layoutRef
    const matchDark = () => window.matchMedia('(prefers-color-scheme: dark)')
    const onChangeTheme = () => ctrl.config.updateTheme()
    matchDark().addEventListener('change', onChangeTheme)
    onCleanup(() => matchDark().removeEventListener('change', onChangeTheme))
  })

  onMount(async () => {
    if (!isTauri()) return
    const unlisten = await appWindow.onFileDropEvent(async (event) => {
      if (event.payload.type === 'hover') {
        remote.info('🔗 User hovering')
      } else if (event.payload.type === 'drop') {
        remote.info('🔗 User dropped')
        for (const path of event.payload.paths) {
          const mime = await remote.getMimeType(path)
          const isImage = mime.startsWith('image/')
          const isVideo = mime.startsWith('video/')

          if (isImage || isVideo) {
            const x = mouseEnterCoords.x
            const y = mouseEnterCoords.y

            if (store.mode === Mode.Editor) {
              const currentFile = ctrl.file.currentFile
              if (!currentFile?.editorView) return
              const d = currentFile?.path
                ? await remote.dirname(currentFile.path)
                : undefined
              const p = await remote.toRelativePath(path, d)
              ctrl.image.insert(p, x, y, mime)
            } else if (store.mode === Mode.Canvas) {
              const p = await remote.toRelativePath(path)
              const src = await ctrl.image.getImagePath(p)
              const point = ctrl.canvas.getPosition([x, y])
              if (!point) return

              if (isImage) {
                const img = new Image()
                img.onload = () => {
                  ctrl.canvas.addImage(src, point, img.width, img.height)
                }
                img.src = src
              } else {
                const video = document.createElement('video')
                video.addEventListener('loadedmetadata', () => {
                  ctrl.canvas.addVideo(p, mime, point, video.videoWidth, video.videoHeight)
                })
                video.src = src
              }
            }
          } else if (mime.startsWith('text/')) {
            await ctrl.editor.openFile({path})
            return
          }
        }
      } else {
        remote.info('🔗 File drop cancelled')
      }
    })

    onCleanup(() => unlisten())
  })

  onMount(async () => {
    if (!isTauri()) return
    const unlistenResize = await appWindow.onResized(async ({payload}) => {
      ctrl.app.updateWindow(payload)
    })

    const unlistenMove = await appWindow.onMoved(async ({payload}) => {
      ctrl.app.updateWindow(payload)
    })

    onCleanup(() => {
      unlistenResize()
      unlistenMove()
    })
  })

  onMount(async () => {
    if (isTauri()) return
    const onDrop = (e: DragEvent) => {
      e.preventDefault()

      if ((e.target as Element).closest('.cm-container')) {
        return
      }

      for (const file of e.dataTransfer?.files ?? []) {
        if (file.type.startsWith('image/')) {
          const x = mouseEnterCoords.x
          const y = mouseEnterCoords.y
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.onloadend = () => {
            const data = reader.result as string
            if (store.mode === Mode.Editor) {
              const currentFile = ctrl.file.currentFile
              if (!currentFile?.editorView) return
              ctrl.image.insert(data, x, y)
            } else {
              const img = new Image()
              img.src = data
              img.onload = () => {
                const point = ctrl.canvas.getPosition([x, y])
                if (!point) return
                ctrl.canvas.addImage(data, point, img.width, img.height)
              }
            }
          }
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

  createEffect(async () => {
    if (store.mode === Mode.Canvas) return

    const wheel = new WheelGesture(scrollRef, ({ctrlKey, event, delta: [, dy]}) => {
      if (!ctrlKey) return
      event.preventDefault()
      const max = Math.min(document.body.clientWidth, 1800)
      const currentWidth = store.config.contentWidth
      ctrl.config.updateContentWidth(Math.max(400, Math.min(max, currentWidth - dy)))
    }, {eventOptions: {passive: false}})

    onCleanup(() => {
      wheel.destroy()
    })
  })

  createEffect(() => {
    const currentFile = ctrl.file.currentFile
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentFile && !currentCanvas) {
      // Init on first render
      ctrl.app.init()
    } else if (
      // Render editor if change file
      store.mode === Mode.Editor &&
      currentFile?.id &&
      currentFile.editorView === undefined
    ) {
      ctrl.editor.renderEditor(editorRef!)
    }
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
            <Match when={store.error}><ErrorView /></Match>
            <Match when={store.args?.dir}><Dir /></Match>
            <Match when={store.mode === Mode.Canvas}><Canvas /></Match>
            <Match when={store.mode === Mode.Editor}>
              <Scroll data-tauri-drag-region="true" ref={scrollRef}>
                <Select target={() => scrollRef} />
                <Editor ref={editorRef} />
              </Scroll>
            </Match>
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
