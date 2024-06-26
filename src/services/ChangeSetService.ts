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

    const newDoc = new Y.Doc({gc: false})
    const type = newDoc.getXmlFragment(currentFile.id)
    this.store.collab?.ydoc?.getXmlFragment(currentFile.id).forEach((x) => type.push([x.clone()]))
    const ydoc = Y.encodeStateAsUpdate(newDoc)

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
    const ydoc = this.store.collab!.ydoc!
    const type = ydoc.getXmlFragment(currentFile.id)
    type.delete(0, type.length)
    Y.applyUpdate(ydoc, version.ydoc)
    this.ctrl.editor.updateEditorState(currentFile)
    this.setState('collab', 'snapshot', undefined)
    // trigger EditorProps.editable function
    const tr = currentFile.editorView.state.tr
    tr.setSelection(TextSelection.atStart(currentFile.editorView.state.doc))
    currentFile.editorView.dispatch(tr)
  }
}
