import {getMimeType} from '@/remote/editor'
import type {File} from '@/types'
import {FileService} from './FileService'
import type {ProjectService} from './ProjectService'
import type {TreeService} from './TreeService'

export class ProjectFileService {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService,
    private treeService: TreeService,
  ) {}

  async newFileByPath(params: {
    path?: string
    newFile?: string
    projectId?: string
  }): Promise<File> {
    const {path, newFile} = params
    const p = path ?? newFile
    if (!p) throw new Error('Argument path or newFile missing')

    const id = FileService.createId(p)
    const project = this.projectService.projects.find((it) =>
      it.worktreePath ? p.includes(it.worktreePath) : false,
    )
    // If multiple projects include the same file priorize passed project ID
    const projectId = params.projectId ?? project?.id

    let file = await this.fileService.findFileByPath(p)
    if (!file) {
      const mime = await getMimeType(p)
      const code = !mime.startsWith('text/markdown')
      file = await this.fileService.newFile({id, newFile, path, code, projectId})
    }

    if (this.treeService.getItem(file.id)) {
      this.treeService.setValue(file)
    } else {
      this.treeService.add(file)
    }

    return file
  }
}
