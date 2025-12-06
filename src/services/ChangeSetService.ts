import * as Y from 'yjs'
import {info} from '@/remote/log'
import type {Version} from '@/state'
import type {CollabService} from './CollabService'
import {FileService} from './FileService'

export class ChangeSetService {
  constructor(
    private fileService: FileService,
    private collabService: CollabService,
  ) {}

  async addVersion() {
    const currentFile = this.fileService.currentFile
    if (!currentFile) return

    const subdoc = this.collabService.getSubdoc(currentFile.id)
    const ydoc = Y.encodeStateAsUpdate(subdoc)

    const versions = [...currentFile.versions, {ydoc, date: new Date()}]

    this.fileService.updateFile(currentFile.id, {versions})
    const updatedFile = this.fileService.currentFile
    if (!updatedFile) return
    await FileService.saveFile(updatedFile)
    info('Saved new snapshot version')
  }

  applyVersion(version: Version) {
    const currentFile = this.fileService.currentFile
    if (!currentFile) return
    this.fileService.updateFile(currentFile.id, {ydoc: version.ydoc})
    info('Change set version applied')
  }
}
