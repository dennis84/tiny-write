import {SetStoreFunction, Store} from 'solid-js/store'
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
    const ydoc = new Y.Doc({gc: false})
    Y.applyUpdate(ydoc, version.ydoc)
    this.setState('collab', 'snapshot', ydoc)
    this.ctrl.editor.updateEditorState()
  }

  unrenderVersion() {
    this.setState('collab', 'snapshot', undefined)
    this.ctrl.editor.updateEditorState()
  }

  applyVersion(version: Version) {
    const currentFile = this.ctrl.file.currentFile
    const ydoc = this.store.collab!.ydoc!
    const type = ydoc.getXmlFragment(currentFile?.id)
    type.delete(0, type.length)
    Y.applyUpdate(ydoc, version.ydoc)
    this.ctrl.editor.updateEditorState()
  }
}
