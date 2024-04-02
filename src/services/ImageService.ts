import {convertFileSrc} from '@tauri-apps/api/core'
import {EditorView} from 'prosemirror-view'
import markdownit from 'markdown-it'
import {resolvePath, dirname} from '@/remote'
import {Ctrl} from '.'

const md = markdownit({html: false})

export class ImageService {
  constructor(private ctrl: Ctrl) {}

  async getImagePath(src: string, path?: string) {
    const s = decodeURIComponent(src)
    const paths = path ? [await dirname(path), s] : [s]
    const absolutePath = await resolvePath(paths)
    return convertFileSrc(absolutePath)
  }

  insert(data: string, left: number, top: number, mime?: string) {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile?.editorView) return

    if (currentFile.markdown) {
      const link = md.normalizeLink(data)
      const text = `![](${link})`
      const pos = currentFile.editorView.posAtCoords({left, top})
      const tr = currentFile.editorView.state.tr
      tr.insertText(text, pos?.pos ?? currentFile.editorView.state.doc.content.size)
      currentFile.editorView.dispatch(tr)
    } else if (mime && mime.startsWith('video/')) {
      this.insertVideo(currentFile.editorView, data, mime, left, top)
    } else {
      this.insertImage(currentFile.editorView, data, left, top)
    }
  }

  private insertImage(view: EditorView, src: string, left: number, top: number) {
    const state = view.state
    const tr = state.tr
    const node = state.schema.nodes.image.create({src})
    const pos = view.posAtCoords({left, top})
    tr.insert(pos?.pos ?? state.doc.content.size, node)
    view.dispatch(tr)
  }

  private insertVideo(view: EditorView, src: string, type: string, left: number, top: number) {
    const state = view.state
    const tr = state.tr
    const node = state.schema.nodes.video.create({src, type})
    const pos = view.posAtCoords({left, top})
    tr.insert(pos?.pos ?? state.doc.content.size, node)
    view.dispatch(tr)
  }
}
