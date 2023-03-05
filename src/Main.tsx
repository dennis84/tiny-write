import {Show, onCleanup, createEffect, onError, onMount} from 'solid-js'
import {createMutable} from 'solid-js/store'
import {appWindow} from '@tauri-apps/api/window'
import {EditorView} from 'prosemirror-view'
import {State, StateContext} from './state'
import {createCtrl} from '@/ctrl'
import * as remote from '@/remote'
import {isTauri} from '@/env'
import * as config from '@/config'
import {Scroll, Layout} from '@/components/Layout'
import Editor from '@/components/Editor'
import Menu from '@/components/Menu'
import ErrorView from '@/components/Error'
import Dir from '@/components/Dir'
import {insertImage, insertVideo} from '@/prosemirror/image'

export default (props: {state: State}) => {
  const {store, ctrl} = createCtrl(props.state)
  const mouseEnterCoords = createMutable({x: 0, y: 0})
  let editorRef: HTMLDivElement | undefined

  const onDragOver = (e: DragEvent) => {
    mouseEnterCoords.x = e.pageX
    mouseEnterCoords.y = e.pageY
  }

  const insertImageMd = (
    editorView: EditorView,
    data: string,
    left: number,
    top: number,
    mime?: string
  ) => {
    if (store.editor?.markdown) {
      const text = `![](${data})`
      const pos = editorView.posAtCoords({left, top})
      const tr = editorView.state.tr
      tr.insertText(text, pos?.pos ?? editorView.state.doc.content.size)
      editorView.dispatch(tr)
    } else if (mime && mime.startsWith('video/')) {
      insertVideo(editorView, data, mime, left, top)
    } else {
      insertImage(editorView, data, left, top)
    }
  }

  onMount(() => {
    setupFonts()
    if (store.error) return
    ctrl.init(editorRef!)

    const matchDark = () => window.matchMedia('(prefers-color-scheme: dark)')
    const onChangeTheme = () => ctrl.updateTheme()
    matchDark().addEventListener('change', onChangeTheme)
    onCleanup(() => matchDark().removeEventListener('change', onChangeTheme))
  })

  onMount(async () => {
    if (!isTauri) return
    const unlisten = await appWindow.onFileDropEvent(async (event) => {
      if (event.payload.type === 'hover') {
        remote.log('INFO', '🔗 User hovering')
      } else if (event.payload.type === 'drop') {
        remote.log('INFO', '🔗 User dropped')
        for (const path of event.payload.paths) {
          const mime = await remote.getMimeType(path)
          if (mime.startsWith('image/') || mime.startsWith('video/')) {
            if (!store.editor?.editorView) return
            const x = mouseEnterCoords.x
            const y = mouseEnterCoords.y
            const d = store.editor?.path ? await remote.dirname(store.editor.path) : undefined
            const p = await remote.toRelativePath(path, d)
            insertImageMd(store.editor.editorView, p, x, y, mime)
          } else if (mime.startsWith('text/')) {
            await ctrl.openFile({path})
            return
          }
        }
      } else {
        remote.log('INFO', '🔗 File drop cancelled')
      }
    })

    onCleanup(() => unlisten())
  })

  onMount(async () => {
    if (!isTauri) return
    const unlistenResize = await appWindow.onResized(async ({payload}) => {
      ctrl.updateWindow(payload)
    })

    const unlistenMove = await appWindow.onMoved(async ({payload}) => {
      ctrl.updateWindow(payload)
    })

    onCleanup(() => {
      unlistenResize()
      unlistenMove()
    })
  })

  onMount(async () => {
    if (isTauri) return
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
            if (!store.editor?.editorView) return
            insertImageMd(store.editor.editorView, reader.result as string, x, y)
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
    const onWheel = (e: WheelEvent) => {
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
    if (!store.editor?.lastModified) return
    const doc = store.editor.editorView?.state.doc
    const len = doc?.content.size ?? 0
    if (len > 0) {
      const text = doc?.textBetween(0, Math.min(30, len), ' ') ?? ''
      document.title = text
    }
  })

  createEffect(() => {
    const root = document.documentElement
    const c = store.config
    root.style.setProperty('--background', config.background(c))
    root.style.setProperty('--foreground', config.foreground(c))
    root.style.setProperty('--foreground-80', `${config.foreground(c)}cc`)
    root.style.setProperty('--foreground-60', `${config.foreground(c)}99`)
    root.style.setProperty('--foreground-50', `${config.foreground(c)}80`)
    root.style.setProperty('--foreground-20', `${config.foreground(c)}33`)
    root.style.setProperty('--foreground-10', `${config.foreground(c)}1a`)
    root.style.setProperty('--foreground-5', `${config.foreground(c)}0D`)
    root.style.setProperty('--primary-background', config.primaryBackground(c))
    root.style.setProperty('--primary-background-20', `${config.primaryBackground(c)}33`)
    root.style.setProperty('--primary-foreground', config.primaryForeground(c))
    root.style.setProperty('--selection-border', `${config.primaryBackground(c)}44`)
    root.style.setProperty('--selection', config.selection(c))
    root.style.setProperty('--tooltip-background', config.tooltipBackground(c))
    root.style.setProperty('--font-family', config.font(c).label)
    root.style.setProperty('--font-family-monospace', config.font(c, {monospace: true}).label)
    root.style.setProperty('--font-family-bold', config.font(c, {bold: true}).label)
    root.style.setProperty('--font-family-italic', config.font(c, {italic: true}).label)
    root.style.setProperty('--font-size', `${c.fontSize}px`)
    root.style.setProperty('--font-size-h1', `${c.fontSize * 1.8}px`)
    root.style.setProperty('--font-size-h2', `${c.fontSize * 1.4}px`)
    root.style.setProperty('--font-size-h3', `${c.fontSize * 1.2}px`)
    root.style.setProperty('--border-radius', config.styles.borderRadius)
    root.style.setProperty('--menu-font-family', 'iA Writer Mono')
    root.style.setProperty('--menu-font-size', '14px')
  })

  return (
    <StateContext.Provider value={[store, ctrl]}>
      <Layout
        data-testid={store.error ? 'error' : store.loading}
        onDragOver={onDragOver}>
        <Show when={store.error}><ErrorView /></Show>
        <Show when={store.args?.dir && !store.error}><Dir /></Show>
        <Scroll
          hide={store.error !== undefined || store.args?.dir?.length !== undefined}
          data-tauri-drag-region="true">
          <Editor
            config={store.config}
            ref={editorRef}
            spellcheck={store.config.spellcheck}
            markdown={store.editor?.markdown}
            data-tauri-drag-region="true"
          />
        </Scroll>
        <Menu />
      </Layout>
    </StateContext.Provider>
  )
}

const setupFonts = () => {
  let styles = ''
  for (const k of Object.keys(config.fonts)) {
    const font = config.fonts[k]
    if (font.regular) {
      styles += `
        @font-face {
          font-family: '${font.label}';
          src: url('${font.regular}');
        }
      `
    }
    if (font.bold) {
      styles += `
        @font-face {
          font-family: '${font.label} Bold';
          src: url('${font.bold}');
        }
      `
    }
    if (font.italic) {
      styles += `
        @font-face {
          font-family: '${font.label} Italic';
          src: url('${font.italic}');
        }
      `
    }
  }

  const style = document.createElement('style')
  style.textContent = styles
  document.head.append(style)
}
