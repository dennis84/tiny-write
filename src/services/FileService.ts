import {SetStoreFunction, Store} from 'solid-js/store'
import * as Y from 'yjs'
import {v4 as uuidv4} from 'uuid'
import {File, FileText, Mode, ServiceError, State, isLinkElement} from '@/state'
import * as remote from '@/remote'
import {DB} from '@/db'
import {createExtensions, createSchema} from '@/prosemirror-setup'
import {createMarkdownParser} from '@/markdown'
import {Ctrl} from '.'

export interface LoadedFile {
  text: FileText;
  lastModified: Date;
  path: string;
}

export type OpenFile = {id?: string; path?: string}

export class FileService {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get currentFile(): File | undefined {
    return this.store.files.find((f) => f.active)
  }

  get currentFileIndex(): number {
    return this.store.files.findIndex((f) => f.active)
  }

  createFile(params: Partial<File> = {}): File {
    const ydoc = params.ydoc ?? Y.encodeStateAsUpdate(this.createYdoc())
    return {
      markdown: false,
      ...params,
      id: params.id ?? uuidv4(),
      ydoc,
      versions: [],
    }
  }

  findFile(req: OpenFile): File | undefined {
    return this.store.files.find((file) => {
      return file.id === req.id || (file.path && file.path === req.path)
    })
  }

  async loadFile(path: string): Promise<LoadedFile> {
    try {
      const resolvedPath = await remote.resolvePath([path])
      const fileContent = await remote.readFile(resolvedPath)
      const lastModified = await remote.getFileLastModified(resolvedPath)
      const extensions = createExtensions({ctrl: this.ctrl})
      const schema = createSchema(extensions)
      const parser = createMarkdownParser(schema)
      const doc = parser.parse(fileContent)?.toJSON()
      const text = {
        doc,
        selection: {
          type: 'text',
          anchor: 1,
          head: 1
        }
      }

      return {
        text,
        lastModified,
        path: resolvedPath,
      }
    } catch (e) {
      throw new ServiceError('file_permission_denied', {error: e})
    }
  }

  updateFile(id: string, update: Partial<File>) {
    const index = this.store.files.findIndex((file) => file.id === id)
    if (index === -1) return

    let ydoc = this.store.files[index].ydoc
    const doc = this.store.collab!.ydoc!
    if (doc.share.has(id)) {
      const newDoc = new Y.Doc({gc: false})
      const newType = newDoc.getXmlFragment(id)
      const type = doc.getXmlFragment(id)
      // @ts-ignore
      newType.insert(0, type.toArray().map((el) => el instanceof Y.AbstractType ? el.clone() : el))
      ydoc = Y.encodeStateAsUpdate(newDoc)
    }

    this.setState('files', index, {...update, ydoc})
  }

  destroy() {
    if (!this.currentFile) return
    this.currentFile?.editorView?.destroy()
    const index = this.currentFileIndex
    if (index === -1) return
    this.setState('files', index, 'editorView', undefined)
  }

  async saveFile(file: File) {
    if (!file.lastModified) {
      return
    }

    DB.updateFile({
      id: file.id,
      parentId: file.parentId,
      leftId: file.leftId,
      ydoc: file.ydoc!,
      lastModified: file.lastModified,
      path: file.path,
      markdown: file.markdown,
      active: file.active,
      deleted: file.deleted,
      versions: file.versions.map((v) => ({
        date: v.date,
        ydoc: v.ydoc,
      }))
    })
  }

  async fetchFiles(): Promise<File[]> {
    const fetched = await DB.getFiles()
    const files = []
    for (const file of fetched ?? []) {
      try {
        files.push({
          id: file.id,
          parentId: file.parentId,
          leftId: file.leftId,
          ydoc: file.ydoc,
          lastModified: new Date(file.lastModified),
          path: file.path,
          markdown: file.markdown,
          active: file.active,
          deleted: file.deleted,
          versions: (file.versions ?? []).map((v) => ({
            date: v.date,
            ydoc: v.ydoc,
          })),
        })
      } catch (err) {
        remote.log('ERROR', 'Ignore file due to invalid ydoc.')
      }
    }

    return files
  }

  async deleteFile(req: OpenFile) {
    const currentFile = this.currentFile
    const file = this.findFile(req)
    if (!file) return

    this.updateFile(file.id, {
      deleted: true,
      active: false,
      lastModified: new Date(),
    })

    let max = 0
    let maxId = undefined
    if (currentFile?.id === file.id) {
      for (const f of this.store.files) {
        if (f.id === file.id) continue
        const t = f.lastModified?.getTime() ?? 0
        if (t >= max) {
          max = t
          maxId = f.id
        }
      }
    }

    const updatedFile = this.findFile(req)
    if (!updatedFile) return

    this.saveFile(updatedFile)
    remote.info('💾 File deleted')

    if (this.store.mode === Mode.Editor) {
      if (maxId) await this.ctrl.editor.openFile({id: maxId})
    }
  }

  async deleteForever(id: string) {
    const files = this.store.files.filter((it) => it.id !== id)
    this.setState({files})

    this.store.canvases.forEach((canvas, canvasIndex) => {
      const elements = []
      let shouldUpdate = false
      for (const el of canvas.elements) {
        if (el.id === id || (isLinkElement(el) && (el.to === id || el.from === id))) {
          shouldUpdate = true
          continue
        }

        elements.push(el)
      }

      if (shouldUpdate) {
        this.setState('canvases', canvasIndex, 'elements', elements)
        const updated = this.ctrl.canvas.findCanvas(canvas.id)
        if (updated) DB.updateCanvas(updated)
      }
    })

    await DB.deleteFile(id)
    remote.info('File forever deleted')
  }

  async restore(id: string) {
    const file = this.findFile({id})
    if (!file) return

    this.updateFile(id, {deleted: false})

    const updateFile = this.findFile({id})
    if (!updateFile) return

    this.saveFile(updateFile)
    remote.info('File restored')
  }

  private createYdoc(bytes?: Uint8Array): Y.Doc {
    const ydoc = new Y.Doc({gc: false})
    if (bytes) Y.applyUpdate(ydoc, bytes)
    return ydoc
  }
}
