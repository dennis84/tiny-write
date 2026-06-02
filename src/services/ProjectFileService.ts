import {prosemirrorJSONToYDoc} from 'y-prosemirror'
import * as Y from 'yjs'
import {isTauri} from '@/env'
import {createMarkdownParser} from '@/prosemirror/markdown-serialize'
import {schema} from '@/prosemirror/schema'
import {getDocument, getMimeType} from '@/remote/editor'
import type {File} from '@/types'
import {FileService} from './FileService'
import type {ProjectService} from './ProjectService'

export class ProjectFileService {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService,
  ) {}

  async newFileByPath(params: {
    path?: string
    newFile?: string
    projectId?: string
    lastCursorPos?: number
    insert?: string
    codeLang?: string
  }): Promise<File> {
    const {path, newFile, insert, codeLang, ...rest} = params
    const p = path ?? newFile
    if (!p) throw new Error('Argument path or newFile missing')

    const id = FileService.createId(p)
    const project = this.projectService.projects.find((it) =>
      it.worktreePath ? p.startsWith(it.worktreePath + '/') || p === it.worktreePath : false,
    )
    // If multiple projects include the same file priorize passed project ID
    const projectId = params.projectId ?? project?.id

    let code = codeLang !== 'markdown'
    let lastModified: Date | undefined

    if (isTauri()) {
      const mime = await getMimeType(p)
      code = !mime.startsWith('text/markdown')
      const doc = await getDocument(p)
      lastModified = doc.lastModified
    }

    const ydoc = insert ? this.createEncodedYdoc(id, code, insert) : undefined

    const file = await this.fileService.newFile({
      id,
      newFile,
      path,
      code,
      codeLang,
      projectId,
      lastModified,
      ydoc,
      ...rest,
    })

    return file
  }

  private createEncodedYdoc(fileId: string, code: boolean, doc: string) {
    if (code) {
      const ydoc = new Y.Doc({gc: false, guid: fileId})
      ydoc.getText(fileId).insert(0, doc)
      return Y.encodeStateAsUpdate(ydoc)
    }

    const parser = createMarkdownParser(schema)
    const parsed = parser.parse(doc)
    if (!parsed) throw new Error(`Failed to parse markdown for file: ${fileId}`)
    const ydoc = prosemirrorJSONToYDoc(schema, parsed.toJSON(), fileId)
    return Y.encodeStateAsUpdate(ydoc)
  }
}
