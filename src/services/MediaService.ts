import {Store} from 'solid-js/store'
import {convertFileSrc} from '@tauri-apps/api/core'
import {EditorView} from 'prosemirror-view'
import {getMimeType, resolvePath, toRelativePath} from '@/remote/editor'
import {File, Mode, State} from '@/state'
import {FileService} from './FileService'
import {CanvasService} from './CanvasService'
import {AppService} from './AppService'
import {CanvasCollabService} from './CanvasCollabService'

interface DropResult {
  file?: File
}

export class MediaService {
  static async getImagePath(path: string, basePath?: string) {
    const s = decodeURIComponent(path)
    const absolutePath = await resolvePath(s, basePath)
    return convertFileSrc(absolutePath)
  }

  constructor(
    private fileService: FileService,
    private canvasService: CanvasService,
    private canvasCollabService: CanvasCollabService,
    private appService: AppService,
    private store: Store<State>,
  ) {}

  async dropFile(blob: Blob, [x, y]: [number, number]) {
    const data = (await this.readFile(blob)) as string

    if (this.store.mode === Mode.Editor) {
      const currentFile = this.fileService.currentFile
      if (!currentFile?.editorView) return
      this.insert(currentFile.editorView, data, x, y)
    } else if (this.store.mode === Mode.Canvas) {
      const file = this.fileService.currentFile
      if (file?.active && file.editorView) {
        this.insert(file.editorView, data, x, y)
      } else {
        const img = await this.loadImage(data)
        const point = this.canvasService.getPosition([x, y])
        if (!point) return
        const el = await this.canvasService.addImage(data, point, img.width, img.height)
        if (el) this.canvasCollabService.addElement(el)
      }
    }
  }

  async dropPath(path: string, [x, y]: [number, number]): Promise<DropResult | undefined> {
    const mime = await getMimeType(path)
    const isImage = mime.startsWith('image/')
    const isVideo = mime.startsWith('video/')
    const isMarkdown = mime.startsWith('text/markdown')

    const basePath = await this.appService.getBasePath()
    const relativePath = await toRelativePath(path, basePath)

    if (this.store.mode === Mode.Editor) {
      if (isImage || isVideo) {
        const currentFile = this.fileService.currentFile
        if (!currentFile?.editorView) return
        this.insert(currentFile.editorView, relativePath, x, y, mime)
        return
      } else {
        let file = await this.fileService.findFileByPath(path)
        if (!file) file = await this.fileService.newFile({path, code: !isMarkdown})
        return {file}
      }
    } else if (this.store.mode === Mode.Canvas) {
      const point = this.canvasService.getPosition([x, y])
      if (!point) return

      let addedElement
      if (isImage) {
        const src = await MediaService.getImagePath(relativePath, basePath)
        const img = await this.loadImage(src)
        addedElement = await this.canvasService.addImage(relativePath, point, img.width, img.height)
      } else if (isVideo) {
        const src = await MediaService.getImagePath(relativePath, basePath)
        const video = await this.loadVideo(src)
        addedElement = await this.canvasService.addVideo(
          relativePath,
          mime,
          point,
          video.videoWidth,
          video.videoHeight,
        )
      } else {
        let file = await this.fileService.findFileByPath(path)
        if (!file) file = await this.fileService.newFile({path, code: !isMarkdown})
        addedElement = (await this.canvasService.addFile(file))?.[0]
      }

      if (addedElement) this.canvasCollabService.addElement(addedElement)
      return
    }

    let file = await this.fileService.findFileByPath(path)
    if (!file) file = await this.fileService.newFile({path, code: !isMarkdown})
    return {file}
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
