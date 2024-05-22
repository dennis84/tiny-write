import {SetStoreFunction, Store} from 'solid-js/store'
import {Node} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirrorJSON} from 'y-prosemirror'
import {v4 as uuidv4} from 'uuid'
import {File, FileText, Mode, ServiceError, State, isLinkElement} from '@/state'
import * as remote from '@/remote'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {createMarkdownParser} from '@/markdown'
import {Ctrl} from '.'
import {schema} from './ProseMirrorService'

export interface LoadedTextFile {
  text: string;
  lastModified: Date;
  path: string;
}

export interface LoadedMarkdownFile {
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

  static async loadTextFile(path: string): Promise<LoadedTextFile> {
    remote.debug(`Load text file (path=${path})`)
    let resolvedPath
    try {
      resolvedPath = await remote.resolvePath(path)
    } catch(e: any) {
      throw new ServiceError('file_not_found', `File not found: ${path}`)
    }

    try {
      const text = await remote.readFile(resolvedPath)
      const lastModified = await remote.getFileLastModified(resolvedPath)
      return {text, lastModified, path: resolvedPath}
    } catch (e: any) {
      throw new ServiceError('file_permission_denied', e)
    }
  }

  static async loadMarkdownFile(path: string): Promise<LoadedMarkdownFile> {
    remote.debug(`Load file (path=${path})`)
    let resolvedPath
    try {
      resolvedPath = await remote.resolvePath(path)
    } catch(e: any) {
      throw new ServiceError('file_not_found', `File not found: ${path}`)
    }

    try {
      const fileContent = await remote.readFile(resolvedPath)
      const lastModified = await remote.getFileLastModified(resolvedPath)
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

  static async saveFile(file: File) {
    if (!file.lastModified) {
      return
    }

    await DB.updateFile({
      id: file.id,
      parentId: file.parentId,
      leftId: file.leftId,
      ydoc: file.ydoc!,
      lastModified: file.lastModified,
      path: file.path,
      newFile: file.newFile,
      active: file.active,
      deleted: file.deleted,
      code: file.code,
      codeLang: file.codeLang,
      versions: file.versions.map((v) => ({
        date: v.date,
        ydoc: v.ydoc,
      }))
    })
  }

  static createFile(params: Partial<File> = {}): File {
    const ydoc = params.ydoc ?? Y.encodeStateAsUpdate(FileService.createYdoc())
    return {
      ...params,
      id: params.id ?? uuidv4(),
      ydoc,
      versions: [],
    }
  }

  static async activateFile(state: State, file: File): Promise<State> {
    const files = []

    for (const f of state.files) {
      f.editorView?.destroy()
      f.codeEditorView?.destroy()
      const active = f.id === file.id
      const newFile = {...f, active, editorView: undefined, codeEditorView: undefined}
      files.push(newFile)
      if (active || f.active) {
        await FileService.saveFile(newFile)
      }
    }

    const mode = file.code ? Mode.Code : Mode.Editor
    await DB.setMeta({mode})

    return {
      ...state,
      error: undefined,
      args: {...state.args, dir: undefined},
      files,
      mode,
    }
  }

  private static createYdoc(bytes?: Uint8Array): Y.Doc {
    const ydoc = new Y.Doc({gc: false})
    if (bytes) Y.applyUpdate(ydoc, bytes)
    return ydoc
  }

  findFileById(id: string): File | undefined {
    return this.store.files.find((file) => file.id === id)
  }

  async findFileByPath(path: string): Promise<File | undefined> {
    if (isTauri()) {
      try {
        path = await remote.resolvePath(path)
      } catch (e) {
        throw new ServiceError('file_not_found', `File not found: ${path}`)
      }
    }

    return this.store.files.find((file) => file.path === path)
  }

  updateFile(id: string, update: Partial<File>) {
    const index = this.store.files.findIndex((file) => file.id === id)
    if (index === -1) return

    const file = this.store.files[index]
    let ydoc = file.ydoc
    const doc = this.store.collab!.ydoc!
    if (doc.share.has(id)) {
      const newDoc = new Y.Doc({gc: false})
      if (file.code) {
        const copy = newDoc.getText(id)
        const org = doc.getText(id)
        copy.applyDelta(org.toDelta())
      } else {
        const newType = newDoc.getXmlFragment(id)
        const type = doc.getXmlFragment(id)
        // @ts-ignore
        newType.insert(0, type.toArray().map((el) => el instanceof Y.AbstractType ? el.clone() : el))
      }

      ydoc = Y.encodeStateAsUpdate(newDoc)
    }

    this.setState('files', index, {...update, ydoc})
  }

  destroy(id?: string) {
    const file = id ? this.findFileById(id) : this.currentFile
    if (!file) return
    file.editorView?.destroy()
    file.codeEditorView?.destroy()
    const index = this.store.files.findIndex((f) => f.id === file.id)
    if (index === -1) return
    this.setState('files', index, {editorView: undefined, codeEditorView: undefined})
  }

  async fetchFiles(): Promise<File[] | undefined> {
    const fetched = await DB.getFiles()
    if (!fetched) return
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
          newFile: file.path,
          active: file.active,
          deleted: file.deleted,
          code: file.code,
          codeLang: file.codeLang,
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

    await FileService.saveFile(updatedFile)
    remote.info('File deleted')
    this.ctrl.tree.create()
  }

  async deleteForever(id: string) {
    const files = this.store.files.filter((it) => it.id !== id)
    this.setState({files})

    for (const [canvasIndex, canvas] of this.store.canvases.entries()) {
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
        if (updated) await DB.updateCanvas(updated)
      }
    }

    await DB.deleteFile(id)
    remote.info('File forever deleted')
  }

  async restore(id: string) {
    const file = this.findFileById(id)
    if (!file) return

    this.updateFile(id, {deleted: false})

    const updateFile = this.findFileById(id)
    if (!updateFile) return

    await FileService.saveFile(updateFile)
    remote.info('File restored')
  }

  async getTitle(file: File, len = 25): Promise<string> {
    if (isTauri() && file.path) return remote.toRelativePath(file.path)
    if (file.code) return 'Code 🖥️'
    const ydoc = new Y.Doc({gc: false})
    Y.applyUpdate(ydoc, file.ydoc)
    const state = yDocToProsemirrorJSON(ydoc, file.id)
    const doc = Node.fromJSON(schema, state)
    return doc?.firstChild?.textContent.substring(0, len) || 'Untitled'
  }
}
