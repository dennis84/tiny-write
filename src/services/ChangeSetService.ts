import {SetStoreFunction, Store} from 'solid-js/store'
import {TextSelection} from 'prosemirror-state'
import * as Y from 'yjs'
import {State, Version} from '@/state'
import * as remote from '@/remote'
import {Ctrl} from '.'

export class ChangeSetService {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  async addVersion() {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile) return

    const subdoc = this.ctrl.collab.getSubdoc(currentFile.id)
    const ydoc = Y.encodeStateAsUpdate(subdoc)

    const versions = [
      ...currentFile.versions,
      {ydoc, date: new Date()}
    ]

    this.ctrl.file.updateFile(currentFile.id, {versions})
    await this.ctrl.editor.saveEditor()
    remote.info('Saved new snapshot version')
  }

  renderVersion(version: Version) {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile) return
    const ydoc = new Y.Doc({gc: false})
    Y.applyUpdate(ydoc, version.ydoc)
    this.setState('collab', 'snapshot', ydoc)
    this.ctrl.editor.updateEditorState(currentFile)
  }

  unrenderVersion() {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile) return
    this.setState('collab', 'snapshot', undefined)
    this.ctrl.editor.updateEditorState(currentFile)
  }

  applyVersion(version: Version) {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile?.editorView) return
    const subdoc = this.ctrl.collab.getSubdoc(currentFile.id)
    const type = subdoc.getXmlFragment(currentFile.id)
    type.delete(0, type.length)
    Y.applyUpdate(subdoc, version.ydoc)
    this.ctrl.editor.updateEditorState(currentFile)
    this.setState('collab', 'snapshot', undefined)
    // trigger EditorProps.editable function
    const tr = currentFile.editorView.state.tr
    tr.setSelection(TextSelection.atStart(currentFile.editorView.state.doc))
    currentFile.editorView.dispatch(tr)
  }
}
