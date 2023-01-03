import {Show, onCleanup, createEffect, onError, onMount} from 'solid-js'
import {createMutable} from 'solid-js/store'
import {listen} from '@tauri-apps/api/event'
import {injectGlobal} from '@emotion/css'
import {State, StateContext} from './state'
import {createCtrl} from '@/ctrl'
import * as remote from '@/remote'
import {isTauri} from '@/env'
import {fonts} from '@/config'
import {Scroll, Layout} from '@/components/Layout'
import Editor from '@/components/Editor'
import Menu from '@/components/Menu'
import ErrorView from '@/components/Error'
import Dir from '@/components/Dir'
import {insertImage, insertVideo} from '@/prosemirror/image'

const fontsStyles = Object.entries(fonts)
  .map(([, value]) => [
    ...(value.regular ? [{
      '@font-face': {
        fontFamily: `${value.label}`,
        src: `url('${value.regular}')`,
      },
    }] : []),
    ...(value.bold ? [{
      '@font-face': {
        fontFamily: `${value.label} Bold`,
        src: `url('${value.bold}')`,
      },
    }] : []),
    ...(value.italic ? [{
      '@font-face': {
        fontFamily: `${value.label} Italic`,
        src: `url('${value.italic}')`,
      },
    }] : []),
  ]).flatMap((x) => x)

injectGlobal(fontsStyles)

export default (props: {state: State}) => {
  const [store, ctrl] = createCtrl(props.state)
  const mouseEnterCoords = createMutable({x: 0, y: 0})
  let editorRef: HTMLDivElement

  const onDragOver = (e: DragEvent) => {
    mouseEnterCoords.x = e.pageX
    mouseEnterCoords.y = e.pageY
  }

  const insertImageMd = (editorView, data, left, top, mime?: string) => {
    if (store.markdown) {
      const text = `![](${data})`
      const pos = editorView.posAtCoords({left, top})
      const tr = editorView.state.tr
      tr.insertText(text, pos?.pos ?? editorView.state.doc.content.size)
      editorView.dispatch(tr)
    } else if (mime && mime.startsWith('video/')) {
      insertVideo(store.editorView, data, mime, left, top)
    } else {
      insertImage(store.editorView, data, left, top)
    }
  }

  onMount(() => {
    if (store.error) return
    ctrl.init(editorRef)
  })

  onMount(() => {
    const matchDark = () => window.matchMedia('(prefers-color-scheme: dark)')
    const onChangeTheme = () => ctrl.updateTheme()
    matchDark().addEventListener('change', onChangeTheme)
    onCleanup(() => matchDark().removeEventListener('change', onChangeTheme))
  })

  onMount(async () => {
    if (!isTauri) return
    const unlisten = await listen('tauri://file-drop', async (event) => {
      for (const path of (event.payload as string[])) {
        const mime = await remote.getMimeType(path)
        if (mime.startsWith('image/') || mime.startsWith('video/')) {
          const x = mouseEnterCoords.x
          const y = mouseEnterCoords.y
          const d = store.path ? await remote.dirname(store.path) : undefined
          const p = await remote.toRelativePath(path, d)
          insertImageMd(store.editorView, p, x, y, mime)
        } else if (mime.startsWith('text/')) {
          await ctrl.openFile({path})
          return
        }
      }
    })

    onCleanup(() => unlisten())
  })

  onMount(async () => {
    if (!isTauri) return
    const unlistenResize = await listen('tauri://resize', async (event) => {
      ctrl.updateWindow(event.payload)
    })

    const unlistenMove = await listen('tauri://move', async (event) => {
      ctrl.updateWindow(event.payload)
    })

    onCleanup(() => {
      unlistenResize()
      unlistenMove()
    })
  })

  onMount(async () => {
    if (isTauri) return
    const onDrop = (e) => {
      e.preventDefault()
      if (e.target.closest('.cm-container')) {
        return
      }

      for (const file of e.dataTransfer.files) {
        if (file.type.startsWith('image/')) {
          const x = mouseEnterCoords.x
          const y = mouseEnterCoords.y
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.onloadend = function() {
            insertImageMd(store.editorView, reader.result as string, x, y)
          }
        }
      }
    }

    window.addEventListener('drop', onDrop)
    onCleanup(() => {
      window.removeEventListener('drop', onDrop)
    })
  })

  onMount(async () => {
    const onWheel = (e) => {
      if (e.ctrlKey && e.buttons === 0) {
        e.preventDefault()
        const max = Math.min(document.body.clientWidth, 1800)
        const currentWidth = store.config.contentWidth
        ctrl.updateContentWidth(Math.max(400, Math.min(max, currentWidth - e.deltaY)))
        return
      }
    }

    document.addEventListener('wheel', onWheel, {passive: false})
    onCleanup(() => {
      document.removeEventListener('wheel', onWheel)
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

  return (
    <StateContext.Provider value={[store, ctrl]}>
      <Layout
        config={store.config}
        data-testid={store.error ? 'error' : store.loading}
        onDragOver={onDragOver}>
        <Show when={store.error}><ErrorView /></Show>
        <Show when={store.args?.dir}><Dir /></Show>
        <Scroll
          config={store.config}
          hide={store.error !== undefined || store.args?.dir?.length !== undefined}
          data-tauri-drag-region="true">
          <Editor
            config={store.config}
            ref={editorRef}
            spellcheck={store.config.spellcheck}
            markdown={store.markdown}
            data-tauri-drag-region="true"
          />
        </Scroll>
        <Menu />
      </Layout>
    </StateContext.Provider>
  )
}
