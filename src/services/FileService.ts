import {batch} from 'solid-js'
import {SetStoreFunction, Store} from 'solid-js/store'
import * as Y from 'yjs'
import {yXmlFragmentToProseMirrorRootNode} from 'y-prosemirror'
import {ySyncFacet} from 'y-codemirror.next'
import {v4 as uuidv4} from 'uuid'
import {File, FileText, Mode, ServiceError, State} from '@/state'
import {
  getDocument,
  getMimeType,
  readText,
  resolvePath,
  toAbsolutePath,
  toRelativePath,
} from '@/remote/editor'
import {debug, error, info} from '@/remote/log'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {createMarkdownParser} from '@/markdown'
import {findCodeLang} from '@/codemirror/highlight'
import {CollabService} from './CollabService'
import {schema} from './ProseMirrorService'

export interface LoadedTextFile {
  text: string
  lastModified: Date
  path: string
}

export interface LoadedMarkdownFile {
  text: FileText
  lastModified: Date
  path: string
}

export class FileService {
  constructor(
    private collabService: CollabService,
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
    debug(`Load text file (path=${path})`)
    let resolvedPath
    try {
      resolvedPath = await resolvePath(path)
    } catch (_e: any) {
      throw new ServiceError('file_not_found', `File not found: ${path}`)
    }

    try {
      const text = await readText(resolvedPath)
      const doc = await getDocument(resolvedPath)
      const lastModified = doc.lastModified
      return {text, lastModified, path: resolvedPath}
    } catch (e: any) {
      throw new ServiceError('file_permission_denied', e)
    }
  }

  static async loadMarkdownFile(path: string): Promise<LoadedMarkdownFile> {
    debug(`Load file (path=${path})`)
    let resolvedPath
    try {
      resolvedPath = await resolvePath(path)
    } catch (_e: any) {
      throw new ServiceError('file_not_found', `File not found: ${path}`)
    }

    try {
      const fileContent = await readText(resolvedPath)
      const lastModified = (await getDocument(resolvedPath)).lastModified
      const parser = createMarkdownParser(schema)
      const doc = parser.parse(fileContent)?.toJSON()
      const text = {
        doc,
        selection: {
          type: 'text',
          anchor: 1,
          head: 1,
        },
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

    if (file.path) {
      await DB.deleteFile(file.id)
      return
    }

    await DB.updateFile({
      id: file.id,
      parentId: file.parentId,
      leftId: file.leftId,
      ydoc: file.ydoc,
      title: file.title,
      lastModified: file.lastModified,
      newFile: file.newFile,
      active: file.active,
      deleted: file.deleted,
      code: file.code,
      codeLang: file.codeLang,
      versions: file.versions.map((v) => ({
        date: v.date,
        ydoc: v.ydoc,
      })),
    })
  }

  static createFile(params: Partial<File> = {}): File {
    const id = params.id ?? uuidv4()
    const ydoc = params.ydoc ?? Y.encodeStateAsUpdate(FileService.createYdoc(id))
    const versions = params.versions ?? []
    const codeLang = FileService.getCodeLang(params)

    return {
      ...params,
      id,
      ydoc,
      codeLang,
      versions,
    }
  }

  static async activateFile(state: State, fileId: string): Promise<State> {
    const files = []
    const canvases = []
    let activeFile

    for (const f of state.files) {
      f.editorView?.destroy()
      f.codeEditorView?.destroy()
      const active = f.id === fileId
      const codeLang = FileService.getCodeLang(f)
      const newFile = {...f, codeLang, active, editorView: undefined, codeEditorView: undefined}
      files.push(newFile)
      if (active) activeFile = newFile
      if (active || f.active) {
        await FileService.saveFile(newFile)
      }
    }

    for (const c of state.canvases) {
      canvases.push({...c, active: false})
    }

    const mode = activeFile?.code ? Mode.Code : Mode.Editor
    await DB.setMode(mode)

    return {
      ...state,
      error: undefined,
      files,
      canvases,
      mode,
    }
  }

  static async fetchFiles(): Promise<File[] | undefined> {
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
          ydoc: file.ydoc ?? new Uint8Array(),
          lastModified: new Date(file.lastModified),
          newFile: file.newFile,
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
        error('Ignore file due to invalid ydoc.')
      }
    }

    return files
  }

  static getCodeLang(file: Partial<File>): string | undefined {
    let codeLang = file.codeLang
    const filePath = file.path ?? file.newFile
    if (!codeLang && filePath) {
      const ext = filePath.substring(filePath.lastIndexOf('.') + 1)
      codeLang = findCodeLang(ext)
    }

    return codeLang
  }

  async newFile(params: Partial<File> = {}): Promise<File> {
    const file = FileService.createFile(params)
    this.setState('files', (prev) => [...prev, file])
    return file
  }

  async newFileByPath(
    path: string | undefined,
    newFile: string | undefined = undefined,
  ): Promise<File | undefined> {
    const p = path ?? newFile
    if (!p) return

    let file = await this.findFileByPath(p)
    if (!file) {
      const mime = await getMimeType(p)
      const code = !mime.startsWith('text/markdown')
      file = await this.newFile({newFile, path, code})
      info(
        `Created new file with path (id=${file.id}, code=${code}, path=${path}, newFile=${newFile}, mime=${mime})`,
      )
    }

    return file
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
      path = await toAbsolutePath(path)
    }

    return this.store.files.find((file) => file.path === path || file.newFile === path)
  }

  updateFile(id: string, u: Partial<File>) {
    const index = this.store.files.findIndex((file) => file.id === id)
    if (index === -1) return
    const update = {...u}

    if (u.lastModified && this.collabService.hasSubdoc(id)) {
      const subdoc = this.collabService.getSubdoc(id)
      update.ydoc = Y.encodeStateAsUpdate(subdoc)
    }

    this.setState('files', index, update)
  }

  async updatePath(fileId: string, path: string) {
    const lastModified = new Date()
    this.updateFile(fileId, {lastModified, path})

    const updatedFile = this.findFileById(fileId)
    if (!updatedFile) return
    await FileService.saveFile(updatedFile)
  }

  destroy(id?: string) {
    const file = id ? this.findFileById(id) : this.currentFile
    if (!file) return
    file.editorView?.destroy()

    if (file.codeEditorView) {
      this.collabService.undoManager?.removeTrackedOrigin(
        file.codeEditorView.state.facet(ySyncFacet),
      )
      file.codeEditorView?.destroy()
    }

    const index = this.store.files.findIndex((f) => f.id === file.id)
    if (index === -1) return
    batch(() => {
      this.setState('files', index, {editorView: undefined, codeEditorView: undefined})
      if (this.store.mode === Mode.Editor || this.store.mode === Mode.Code) {
        this.setState('collab', undefined)
      }
    })
  }

  async restore(id: string) {
    const file = this.findFileById(id)
    if (!file) return

    this.updateFile(id, {deleted: false})

    const updateFile = this.findFileById(id)
    if (!updateFile) return

    await FileService.saveFile(updateFile)
    info('File restored')
  }

  async getTitle(file?: File, len = 25, fallback = true): Promise<string | undefined> {
    if (!file) return fallback ? 'Undefined' : undefined

    if (file.path || file.newFile) {
      return toRelativePath(file.path ?? file.newFile ?? '')
    }

    if (file.code) return file.title ?? (fallback ? 'Code' : undefined)
    else if (file.title) return file.title

    const ydoc = new Y.Doc({gc: false})
    Y.applyUpdate(ydoc, file.ydoc)

    const type = ydoc.getXmlFragment(file.id)
    const doc = yXmlFragmentToProseMirrorRootNode(type, schema)
    return doc?.firstChild?.textContent.substring(0, len) || (fallback ? 'Untitled' : undefined)
  }
}
