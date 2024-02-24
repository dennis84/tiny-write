import {SetStoreFunction, Store} from 'solid-js/store'
import {Node, Schema} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirrorJSON} from 'y-prosemirror'
import {v4 as uuidv4} from 'uuid'
import {File, FileText, Mode, ServiceError, State, isLinkElement} from '@/state'
import * as remote from '@/remote'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {createExtensions, createSchema} from '@/prosemirror-setup'
import {createMarkdownParser} from '@/markdown'
import {Ctrl} from '.'

export interface LoadedFile {
  text: FileText;
  lastModified: Date;
  path: string;
}

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

  findFileById(id: string): File | undefined {
    return this.store.files.find((file) => file.id === id)
  }

  async findFileByPath(path: string): Promise<File | undefined> {
    if (isTauri()) {
      try {
        path = await remote.resolvePath([path])
      } catch (e) {
        throw new ServiceError('file_not_found', `File not found: ${path}`)
      }
    }

    return this.store.files.find((file) => file.path === path)
  }

  async loadFile(path: string): Promise<LoadedFile> {
    let resolvedPath
    try {
      resolvedPath = await remote.resolvePath([path])
    } catch(e: any) {
      throw new ServiceError('file_not_found', `File not found: ${path}`)
    }

    try {
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
    } catch (e: any) {
      throw new ServiceError('file_permission_denied', e)
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
        remote.error('Ignore file due to invalid ydoc.')
      }
    }

    return files
  }

  async deleteFile(id: string) {
    const currentFile = this.currentFile
    const file = this.findFileById(id)
    if (!file) return

    if (this.store.mode === Mode.Editor && currentFile?.id === file.id) {
      let max = 0
      let maxId = undefined
      for (const f of this.store.files) {
        if (f.id === file.id || f.deleted) continue
        const t = f.lastModified?.getTime() ?? 0
        if (t >= max) {
          max = t
          maxId = f.id
        }
      }

      if (maxId) {
        await this.ctrl.editor.openFile(maxId)
      } else {
        await this.ctrl.editor.newFile()
      }
    }

    this.updateFile(file.id, {
      deleted: true,
      active: false,
      lastModified: new Date(),
    })

    const updatedFile = this.findFileById(id)
    if (!updatedFile) return

    this.saveFile(updatedFile)
    remote.info('File deleted')
    this.ctrl.tree.create()
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
    const file = this.findFileById(id)
    if (!file) return

    this.updateFile(id, {deleted: false})

    const updateFile = this.findFileById(id)
    if (!updateFile) return

    await this.saveFile(updateFile)
    remote.info('File restored')
  }

  async getTitle(schema: Schema, file: File, len = 25): Promise<string> {
    if (isTauri() && file.path) return remote.toRelativePath(file.path)
    const ydoc = new Y.Doc({gc: false})
    Y.applyUpdate(ydoc, file.ydoc)
    const state = yDocToProsemirrorJSON(ydoc, file.id)
    const doc = Node.fromJSON(schema, state)
    return doc?.firstChild?.textContent.substring(0, len) || 'Untitled'
  }

  private createYdoc(bytes?: Uint8Array): Y.Doc {
    const ydoc = new Y.Doc({gc: false})
    if (bytes) Y.applyUpdate(ydoc, bytes)
    return ydoc
  }
}
