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
  }): Promise<File> {
    const {path, newFile, lastCursorPos} = params
    const p = path ?? newFile
    if (!p) throw new Error('Argument path or newFile missing')

    const id = FileService.createId(p)
    const project = this.projectService.projects.find((it) =>
      it.worktreePath ? p.includes(it.worktreePath) : false,
    )
    // If multiple projects include the same file priorize passed project ID
    const projectId = params.projectId ?? project?.id

    const mime = await getMimeType(p)
    const code = !mime.startsWith('text/markdown')
    const doc = await getDocument(p)
    const lastModified = doc.lastModified
    const file = await this.fileService.newFile({
      id,
      newFile,
      path,
      code,
      projectId,
      lastCursorPos,
      lastModified,
    })

    return file
  }
}
