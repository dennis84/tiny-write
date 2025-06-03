import type {SetStoreFunction} from 'solid-js/store'
import {TextSelection} from 'prosemirror-state'
import * as Y from 'yjs'
import type {State, Version} from '@/state'
import {info} from '@/remote/log'
import {FileService} from './FileService'
import type {CollabService} from './CollabService'
import type {EditorService} from './EditorService'

export class ChangeSetService {
  constructor(
    private fileService: FileService,
    private collabService: CollabService,
    private editorService: EditorService,
    private setState: SetStoreFunction<State>,
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

  renderVersion(version: Version) {
    const currentFile = this.fileService.currentFile
    if (!currentFile) return
    const ydoc = new Y.Doc({gc: false})
    Y.applyUpdate(ydoc, version.ydoc)
    this.setState('collab', 'snapshot', ydoc)
    this.editorService.updateEditorState(currentFile)
  }

  unrenderVersion() {
    const currentFile = this.fileService.currentFile
    if (!currentFile) return
    this.setState('collab', 'snapshot', undefined)
    this.editorService.updateEditorState(currentFile)
  }

  applyVersion(version: Version) {
    const currentFile = this.fileService.currentFile
    if (!currentFile?.editorView) return
    const subdoc = this.collabService.getSubdoc(currentFile.id)
    const type = subdoc.getXmlFragment(currentFile.id)
    type.delete(0, type.length)
    Y.applyUpdate(subdoc, version.ydoc)
    this.editorService.updateEditorState(currentFile)
    this.setState('collab', 'snapshot', undefined)
    // trigger EditorProps.editable function
    const tr = currentFile.editorView.state.tr
    tr.setSelection(TextSelection.atStart(currentFile.editorView.state.doc))
    currentFile.editorView.dispatch(tr)
  }
}
