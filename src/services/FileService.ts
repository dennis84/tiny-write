import {rename} from '@tauri-apps/plugin-fs'
import {createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import {ySyncFacet} from 'y-codemirror.next'
import {yXmlFragmentToProseMirrorRootNode} from 'y-prosemirror'
import * as Y from 'yjs'
import {findCodeLang} from '@/codemirror/highlight'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {createMarkdownParser} from '@/prosemirror/markdown-serialize'
import {schema} from '@/prosemirror/schema'
import {
  basename,
  dirname,
  getDocument,
  getMimeType,
  readText,
  resolvePath,
  toAbsolutePath,
  toRelativePath,
} from '@/remote/editor'
import {debug, error, info} from '@/remote/log'
import {isLocalFile} from '@/state'
import type {File, FileText, State} from '@/types'
import type {CollabService} from './CollabService'
import type {LocationService} from './LocationService'

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
  private activeFileSignal = createSignal<string>()

  constructor(
    private collabService: CollabService,
    private locationService: LocationService,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get activeFile() {
    return this.activeFileSignal[0]
  }

  get currentFileId(): string | undefined {
    return this.locationService.editorId ?? this.locationService.codeId ?? this.activeFile()
  }

  get currentFile(): File | undefined {
    const fileId = this.currentFileId
    if (!fileId) return undefined
    return this.store.files.find((f) => f.id === fileId)
  }

  get currentFileIndex(): number {
    const fileId = this.currentFileId
    if (!fileId) return -1
    return this.store.files.findIndex((f) => f.id === fileId)
  }

  static async loadTextFile(path: string): Promise<LoadedTextFile> {
    debug(`Load text file (path=${path})`)
    let resolvedPath: string
    try {
      resolvedPath = await resolvePath(path)
    } catch {
      throw new Error(`File not found: ${path}`)
    }

    try {
      const text = await readText(resolvedPath)
      const doc = await getDocument(resolvedPath)
      const lastModified = doc.lastModified
      return {text, lastModified, path: resolvedPath}
    } catch (e: any) {
      throw new Error('Permission denied', e)
    }
  }

  static async loadMarkdownFile(path: string): Promise<LoadedMarkdownFile> {
    debug(`Load file (path=${path})`)
    let resolvedPath: string
    try {
      resolvedPath = await resolvePath(path)
    } catch {
      throw new Error(`File not found: ${path}`)
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
      throw new Error('Permission denied', e)
    }
  }

  static async saveFile(file: File) {
    if (!file.lastModified) {
      return
    }

    // Don't save files that are linked to real file system paths or new unsaved files.
    if (isLocalFile(file)) {
      await DB.deleteFile(file.id)
      return
    }

    debug(`Saving file (id=${file.id}, leftId=${file.leftId}, parentId=${file.parentId})`)

    await DB.updateFile({
      id: file.id,
      parentId: file.parentId,
      leftId: file.leftId,
      ydoc: file.ydoc,
      title: file.title,
      lastModified: file.lastModified,
      newFile: file.newFile,
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
    const codeLang = params.codeLang ?? FileService.guessCodeLang(params)

    return {
      ...params,
      id,
      ydoc,
      codeLang,
      versions,
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
      } catch {
        error('Ignore file due to invalid ydoc.')
      }
    }

    return files
  }

  static guessCodeLang(file: Partial<File>): string | undefined {
    const path = file.path ?? file.newFile ?? file.title
    if (!path) return file.codeLang
    const ext = path.substring(path.lastIndexOf('.') + 1)
    return findCodeLang(ext) ?? file.codeLang
  }

  setActiveFile(id?: string) {
    this.activeFileSignal[1](id)
  }

  async newFile(params: Partial<File> = {}): Promise<File> {
    if (params.id) {
      const file = this.findFileById(params.id)
      if (file) return file
    }

    const file = FileService.createFile(params)
    info(
      `Created new file (id=${file.id}, code=${file.code}, path=${file.path}, newFile=${file.newFile})`,
    )
    this.setState('files', (prev) => [...prev, file])
    await FileService.saveFile(file)
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
    }

    return file
  }

  private static createYdoc(id: string, bytes?: Uint8Array): Y.Doc {
    const ydoc = new Y.Doc({gc: false, guid: id})
    if (bytes) Y.applyUpdate(ydoc, bytes)
    return ydoc
  }

  async addFile(file: File) {
    this.setState('files', (prev) => [...prev, file])
    await FileService.saveFile(file)
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
    this.setState('files', index, u)
  }

  async updatePath(fileId: string, path: string) {
    const lastModified = new Date()
    this.updateFile(fileId, {lastModified, path})

    const updatedFile = this.findFileById(fileId)
    if (!updatedFile) return
    await FileService.saveFile(updatedFile)
  }

  async renameFile(fileId: string, input: string): Promise<File | undefined> {
    const file = this.findFileById(fileId)
    if (!file) return

    const lastModified = new Date()
    const title = input.trim()
    const codeLang = FileService.guessCodeLang({title}) ?? file.codeLang

    if (file.newFile) {
      const dir = await dirname(file.newFile)
      const newFile = `${dir}/${title}`
      this.updateFile(fileId, {lastModified, newFile, codeLang})
    } else if (file.path) {
      const dir = await dirname(file.path)
      const path = `${dir}/${title}`
      await rename(file.path, path)
      this.updateFile(fileId, {lastModified, path, codeLang})
    } else {
      this.updateFile(fileId, {lastModified, title, codeLang})
    }

    const updatedFile = this.findFileById(fileId)
    if (!updatedFile) return
    await FileService.saveFile(updatedFile)
    return updatedFile
  }

  destroy(id: string) {
    info(`Destroy file (id=${id})`)

    const file = this.findFileById(id)
    if (!file) return
    file.editorView?.destroy()

    if (this.activeFile() === id) {
      this.setActiveFile(undefined)
    }

    if (file.codeEditorView) {
      this.collabService.undoManager?.removeTrackedOrigin(
        file.codeEditorView.state.facet(ySyncFacet),
      )
      file.codeEditorView?.destroy()
    }

    const index = this.store.files.findIndex((f) => f.id === file.id)
    if (index === -1) return
    this.setState('files', index, {editorView: undefined, codeEditorView: undefined})
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

  async getTitle(file?: File, maxLength = 25, fallback = true): Promise<string | undefined> {
    if (!file) return fallback ? 'Undefined' : undefined

    if (isLocalFile(file)) {
      return toRelativePath(file.path ?? file.newFile ?? '')
    }

    if (file.code) return file.title ?? (fallback ? 'Code' : undefined)
    else if (file.title) return file.title

    const ydoc = new Y.Doc({gc: false})
    Y.applyUpdate(ydoc, file.ydoc)

    const type = ydoc.getXmlFragment(file.id)
    const doc = yXmlFragmentToProseMirrorRootNode(type, schema)
    return (
      doc?.firstChild?.textContent.substring(0, maxLength) || (fallback ? 'Untitled' : undefined)
    )
  }

  async getFilename(file?: File): Promise<string | undefined> {
    if (file?.path || file?.newFile) {
      return basename(file.path ?? file.newFile ?? '')
    }

    return file?.title ?? ''
  }
}
