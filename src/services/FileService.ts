import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import * as Y from 'yjs'
import {v4 as uuidv4} from 'uuid'
import {fromUint8Array, toUint8Array} from 'js-base64'
import {File, FileText, ServiceError, State} from '@/state'
import * as remote from '@/remote'
import * as db from '@/db'
import {createExtensions, createSchema} from '@/prosemirror-setup'
import {createMarkdownParser} from '@/markdown'

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
  ydoc?: Y.Doc;
}

export class FileService {
  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  createFile(params: Partial<File> = {}): File {
    const ydoc = params.ydoc ?? Y.encodeStateAsUpdate(this.createYdoc())
    return {
      markdown: false,
      ...params,
      id: params.id ?? uuidv4(),
      ydoc,
    }
  }

  async getFile(state: State, req: OpenFile): Promise<File | undefined> {
    const index = state.files.findIndex((file) => {
      return file.id === req.id || (file.path && file.path === req.path)
    })

    if (index === -1) return

    const file = state.files[index]
    if (file?.path) {
      const loadedFile = await this.loadFile(file.path)
      file.text = loadedFile.text
      file.lastModified = loadedFile.lastModified
      file.path = loadedFile.path
    }

    return file
  }

  async loadFile(path: string): Promise<LoadedFile> {
    try {
      const resolvedPath = await remote.resolvePath([path])
      const fileContent = await remote.readFile(resolvedPath)
      const lastModified = await remote.getFileLastModified(resolvedPath)
      const extensions = createExtensions({state: unwrap(this.store)})
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
    if (!update.ydoc) return

    const index = this.store.files.findIndex((file) => file.id === id)
    if (index === -1) return

    const ydoc = new Y.Doc({gc: false})
    const type = ydoc.getXmlFragment(id)
    update.ydoc.getXmlFragment(id).forEach((x) => type.push([x.clone()]))

    this.setState('files', index, {
      lastModified: update.lastModified,
      markdown: update.markdown,
      path: update.path,
      ydoc: Y.encodeStateAsUpdate(ydoc),
    })
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
