import {createSignal} from 'solid-js'
import type {Store} from 'solid-js/store'
import {convertFileSrc} from '@tauri-apps/api/core'
import type {EditorView} from 'prosemirror-view'
import {basename, getMimeType, readBinaryFile, resolvePath, toRelativePath} from '@/remote/editor'
import {
  type Attachment,
  isEditorElement,
  Page,
  type State,
  type File as OpenFile,
  type CanvasElement,
} from '@/state'
import type {FileService} from './FileService'
import type {CanvasService} from './CanvasService'
import type {AppService} from './AppService'
import type {CanvasCollabService} from './CanvasCollabService'

export enum DropTarget {
  Assistant = 'assistant',
}

export interface DroppedFile {
  data: string
  name: string
  type: string
  path?: string
}

interface DropResult {
  file?: OpenFile
}

export class MediaService {
  private droppedFilesSignal = createSignal<Attachment[]>([])

  get droppedFiles() {
    return this.droppedFilesSignal[0]
  }

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

  resetDroppedFiles() {
    this.droppedFilesSignal[1]([])
  }

  async dropFiles(
    files: File[],
    [x, y]: [number, number],
    dropTarget: DropTarget | undefined = undefined,
  ) {
    const page = this.store.lastLocation?.page

    if (dropTarget === DropTarget.Assistant || page === Page.Assistant) {
      const droppedFiles: DroppedFile[] = []
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const data = (await this.readFile(file)) as string
          droppedFiles.push({type: file.type, name: file.name, data})
        }
      }
      this.droppedFilesSignal[1](droppedFiles)
      return
    }

    if (page === Page.Editor) {
      for (const blob of files) {
        const data = (await this.readFile(blob)) as string
        const currentFile = this.fileService.currentFile
        if (!currentFile?.editorView) return
        this.insert(currentFile.editorView, data, x, y)
      }

      return
    }

    if (page === Page.Canvas) {
      for (const blob of files) {
        const data = (await this.readFile(blob)) as string
        const currentCanvas = this.canvasService.currentCanvas
        if (!currentCanvas) return

        const activeElement = currentCanvas.elements.find((e) => isEditorElement(e) && e.active)
        const file = activeElement && this.fileService.findFileById(activeElement.id)

        if (file?.editorView) {
          this.insert(file.editorView, data, x, y)
        } else {
          const img = await this.loadImage(data)
          const point = this.canvasService.getPosition([x, y])
          if (!point) return
          const el = await this.canvasService.addImage(data, point, img.width, img.height)
          if (el) this.canvasCollabService.addElement(el)
        }
      }

      return
    }
  }

  async dropPaths(
    paths: string[],
    [x, y]: [number, number],
    dropTarget: DropTarget | undefined = undefined,
  ): Promise<DropResult | undefined> {
    const page = this.store.lastLocation?.page

    // Store dropped files locally
    if (dropTarget === DropTarget.Assistant || page === Page.Assistant) {
      const files: DroppedFile[] = []
      for (const path of paths) {
        const arr = await readBinaryFile(path)
        const type = await getMimeType(path)
        const name = await basename(path)
        const base64 = btoa(String.fromCharCode(...arr))
        const data = `data:${type};base64,${base64}`
        files.push({type, name, data, path})
      }

      this.droppedFilesSignal[1](files)
      return
    }

    // Drop files on editor
    if (page === Page.Editor) {
      for (const path of paths) {
        const mime = await getMimeType(path)
        const isImage = mime.startsWith('image/')
        const isVideo = mime.startsWith('video/')
        const isMarkdown = mime.startsWith('text/markdown')

        const basePath = await this.appService.getBasePath()
        const relativePath = await toRelativePath(path, basePath)

        if (isImage || isVideo) {
          const currentFile = this.fileService.currentFile
          if (!currentFile?.editorView) return
          this.insert(currentFile.editorView, relativePath, x, y, mime)
        }

        let file = await this.fileService.findFileByPath(path)
        if (!file) file = await this.fileService.newFile({path, code: !isMarkdown})
        return {file}
      }
    }

    // Drop files on code
    if (page === Page.Code) {
      for (const path of paths) {
        const mime = await getMimeType(path)
        const isMarkdown = mime.startsWith('text/markdown')
        let file = await this.fileService.findFileByPath(path)
        if (!file) file = await this.fileService.newFile({path, code: !isMarkdown})
        return {file}
      }
    }

    // Drop files on canvas
    if (page === Page.Canvas) {
      const point = this.canvasService.getPosition([x, y])
      if (!point) return

      for (const path of paths) {
        const mime = await getMimeType(path)
        const isImage = mime.startsWith('image/')
        const isVideo = mime.startsWith('video/')
        const isMarkdown = mime.startsWith('text/markdown')

        const basePath = await this.appService.getBasePath()
        const relativePath = await toRelativePath(path, basePath)

        let addedElement: CanvasElement | undefined
        if (isImage) {
          const src = await MediaService.getImagePath(relativePath, basePath)
          const img = await this.loadImage(src)
          addedElement = await this.canvasService.addImage(
            relativePath,
            point,
            img.width,
            img.height,
          )
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
      }

      return
    }
  }

  private insert(view: EditorView, data: string, left: number, top: number, mime?: string) {
    if (mime?.startsWith('video/')) {
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
