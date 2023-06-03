import {SetStoreFunction, Store} from 'solid-js/store'
import {EditorView} from 'prosemirror-view'
import * as Y from 'yjs'
import {v4 as uuidv4} from 'uuid'
import {fromUint8Array, toUint8Array} from 'js-base64'
import {File, FileText, ServiceError, State} from '@/state'
import * as remote from '@/remote'
import * as db from '@/db'
import {createExtensions, createSchema} from '@/prosemirror-setup'
import {createMarkdownParser} from '@/markdown'
import {Ctrl} from '.'

export interface LoadedFile {
  text: FileText;
  lastModified: Date;
  path: string;
}

export type OpenFile = {id?: string; path?: string}

export interface UpdateFile {
  lastModified?: Date;
  markdown?: boolean;
  path?: string;
  editorView?: EditorView;
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

  updateFile(id: string, update: UpdateFile) {
    const index = this.store.files.findIndex((file) => file.id === id)
    if (index === -1) return

    const newDoc = new Y.Doc({gc: false})
    const type = newDoc.getXmlFragment(id)
    this.store.collab?.ydoc?.getXmlFragment(id).forEach((x) => type.push([x.clone()]))
    const ydoc = Y.encodeStateAsUpdate(newDoc)
    const hasOwn = (prop: string) => Object.hasOwn(update, prop)

    this.setState('files', index, (prev) => ({
      lastModified: hasOwn('lastModified') ? update.lastModified : prev?.lastModified,
      markdown: hasOwn('markdown') ? update.markdown : prev?.markdown,
      path: hasOwn('path') ? update.path : prev?.path,
      editorView: hasOwn('editorView') ? update.editorView : prev?.editorView,
      ydoc,
    }))
  }

  destroy() {
    if (!this.currentFile) return
    this.currentFile?.editorView?.destroy()
    const index = this.store.files.findIndex((file) => file.id === this.currentFile?.id)
    if (index === -1) return
    this.setState('files', index, 'editorView', undefined)
  }

  async saveFile(file: File) {
    if (!file.lastModified) {
      return
    }

    db.updateFile({
      id: file.id,
      ydoc: fromUint8Array(file.ydoc!),
      lastModified: file.lastModified,
      path: file.path,
      markdown: file.markdown,
      active: file.active,
    })

    const files = await db.getFiles() ?? []
    db.setSize('files', JSON.stringify(files).length)
  }

  async fetchFiles() {
    const fetched = await db.getFiles()
    const files = []

    for (const file of fetched ?? []) {
      try {
        files.push({
          id: file.id,
          ydoc: toUint8Array(file.ydoc),
          lastModified: new Date(file.lastModified),
          path: file.path,
          markdown: file.markdown,
          active: file.active,
        })
      } catch (err) {
        remote.log('ERROR', 'Ignore file due to invalid ydoc.')
      }
    }

    return files
  }

  private createYdoc(bytes?: Uint8Array): Y.Doc {
    const ydoc = new Y.Doc({gc: false})
    if (bytes) Y.applyUpdate(ydoc, bytes)
    return ydoc
  }
}
