import {Store} from 'solid-js/store'
import {convertFileSrc} from '@tauri-apps/api/core'
import {EditorView} from 'prosemirror-view'
import * as remote from '@/remote'
import {Mode, State} from '@/state'
import {Ctrl} from '.'

export class MediaService {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
  ) {}

  async dropFile(blob: Blob, [x, y]: [number, number]) {
    const data = (await this.readFile(blob)) as string

    if (this.store.mode === Mode.Editor) {
      const currentFile = this.ctrl.file.currentFile
      if (!currentFile?.editorView) return
      this.insert(currentFile.editorView, data, x, y)
    } else if (this.store.mode === Mode.Canvas) {
      const file = this.ctrl.file.currentFile
      if (file?.editorView) {
        this.insert(file.editorView, data, x, y)
      } else {
        const img = await this.loadImage(data)
        const point = this.ctrl.canvas.getPosition([x, y])
        if (!point) return
        await this.ctrl.canvas.addImage(data, point, img.width, img.height)
      }
    }
  }

  async dropPath(path: string, [x, y]: [number, number]) {
    const mime = await remote.getMimeType(path)
    const isImage = mime.startsWith('image/')
    const isVideo = mime.startsWith('video/')
    const isText = mime.startsWith('text/')

    if (isImage || isVideo) {
      const basePath = await this.ctrl.app.getBasePath()
      const relativePath = await remote.toRelativePath(path, basePath)

      if (this.store.mode === Mode.Editor) {
        const currentFile = this.ctrl.file.currentFile
        if (!currentFile?.editorView) return
        this.insert(currentFile.editorView, relativePath, x, y, mime)
      } else {
        const src = await this.getImagePath(relativePath, basePath)
        const point = this.ctrl.canvas.getPosition([x, y])
        if (!point) return

        if (isImage) {
          const img = await this.loadImage(src)
          await this.ctrl.canvas.addImage(relativePath, point, img.width, img.height)
        } else {
          const video = await this.loadVideo(src)
          await this.ctrl.canvas.addVideo(relativePath, mime, point, video.videoWidth, video.videoHeight)
        }
      }
    } else if (isText) {
      await this.ctrl.editor.openFileByPath(path)
      this.ctrl.tree.create()
    } else {
      remote.info(`Ignore dropped file (mime=${mime})`)
    }
  }

  async getImagePath(path: string, basePath?: string) {
    const s = decodeURIComponent(path)
    const absolutePath = await remote.resolvePath(s, basePath)
    return convertFileSrc(absolutePath)
  }

  private insert(view: EditorView, data: string, left: number, top: number, mime?: string) {
    if (mime && mime.startsWith('video/')) {
      this.insertVideo(view, data, mime, left, top)
    } else {
      this.insertImage(view, data, left, top)
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

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onerror = (err) => reject(err)
      img.onload = () => resolve(img)
      img.src = src
    })
  }

  private loadVideo(src: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.onloadedmetadata = () => resolve(video)
      video.onerror = (err) => reject(err)
      video.src = src
    })
  }

  private readFile(file: Blob): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result)
      fr.onerror = (err) => reject(err)
      fr.readAsDataURL(file)
    })
  }
}
