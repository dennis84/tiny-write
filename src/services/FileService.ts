import {SetStoreFunction, Store} from 'solid-js/store'
import * as Y from 'yjs'
import {yXmlFragmentToProseMirrorRootNode} from 'y-prosemirror'
import {ySyncFacet} from 'y-codemirror.next'
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
    } catch(_e: any) {
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
    } catch(_e: any) {
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
      title: file.title,
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
    const id = params.id ?? uuidv4()
    const ydoc = params.ydoc ?? Y.encodeStateAsUpdate(FileService.createYdoc(id))
    return {
      ...params,
      id,
      ydoc,
      versions: [],
    }
  }

  static async activateFile(state: State, file: File): Promise<State> {
    const files = []
    const canvases = []

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

    for (const c of state.canvases) {
      canvases.push({...c, active: false})
    }

    const mode = file.code ? Mode.Code : Mode.Editor
    await DB.setMeta({mode})

    return {
      ...state,
      error: undefined,
      args: {...state.args, dir: undefined},
      files,
      canvases,
      mode,
    }
  }

  private static createYdoc(id: string, bytes?: Uint8Array): Y.Doc {
    const ydoc = new Y.Doc({gc: false, guid: id})
    if (bytes) Y.applyUpdate(ydoc, bytes)
    return ydoc
  }

  async addFile(file: File) {
    this.setState('files', (prev) => [...prev, file!])
    await FileService.saveFile(file)
  }

  setActive(id: string, active = true) {
    for (let i = 0; i < this.store.files.length; i++) {
      const cur = this.store.files[i]
      if (cur.id === id) {
        this.setState('files', i, 'active', active)
      } else if (cur.active) {
        this.setState('files', i, 'active', false)
      }
    }
  }

  findFileById(id: string): File | undefined {
    return this.store.files.find((file) => file.id === id)
  }

  async findFileByPath(path: string): Promise<File | undefined> {
    if (isTauri()) {
      try {
        path = await remote.resolvePath(path)
      } catch (_error) {
        throw new ServiceError('file_not_found', `File not found: ${path}`)
      }
    }

    return this.store.files.find((file) => file.path === path)
  }

  updateFile(id: string, u: Partial<File>) {
    const index = this.store.files.findIndex((file) => file.id === id)
    if (index === -1) return
    const update = {...u}

    if (u.lastModified && this.ctrl.collab.hasSubdoc(id)) {
      const subdoc = this.ctrl.collab.getSubdoc(id)
      update.ydoc = Y.encodeStateAsUpdate(subdoc)
    }

    this.setState('files', index, update)
  }

  destroy(id?: string) {
    const file = id ? this.findFileById(id) : this.currentFile
    if (!file) return
    file.editorView?.destroy()

    if (file.codeEditorView) {
      this.ctrl.collab.undoManager?.removeTrackedOrigin(file.codeEditorView.state.facet(ySyncFacet))
      file.codeEditorView?.destroy()
    }

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
          title: file.title,
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
      } catch (_err) {
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

  async getTitle(file?: File, len = 25): Promise<string> {
    if (!file) return 'Undefined'
    if (isTauri() && file.path) return remote.toRelativePath(file.path)
    if (file.code) return (file.title ?? 'Code')
    else if (file.title) return file.title

    const ydoc = new Y.Doc({gc: false})
    Y.applyUpdate(ydoc, file.ydoc)

    const type = ydoc.getXmlFragment(file.id)
    const doc = yXmlFragmentToProseMirrorRootNode(type, schema)
    return doc?.firstChild?.textContent.substring(0, len) || 'Untitled'
  }
}
