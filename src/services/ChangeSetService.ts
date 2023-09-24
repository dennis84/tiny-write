import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {Node, Slice} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirrorJSON, ySyncPluginKey} from 'y-prosemirror'
import {State, Version} from '@/state'
import * as remote from '@/remote'
import {Ctrl} from '.'

export class ChangeSetService {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  addVersion() {
    const ydoc = this.store.collab?.ydoc
    if (!ydoc) return

    const versions = ydoc.getArray<Version>('versions')
    const prevVersion = versions.get(versions.length - 1)
    const prevSnapshot = prevVersion ? Y.decodeSnapshot(prevVersion.snapshot) : Y.emptySnapshot
    const snapshot = Y.snapshot(ydoc)

    if (prevVersion) {
      prevSnapshot.sv.set(prevVersion.clientID, prevSnapshot.sv.get(prevVersion.clientID)! + 1)
    }

    if (!Y.equalSnapshots(prevSnapshot, snapshot)) {
      versions.push([{
        date: this.ctrl.file.currentFile?.lastModified?.getTime() ?? 0,
        snapshot: Y.encodeSnapshot(snapshot),
        clientID: ydoc.clientID,
      }])
    }

    this.ctrl.editor.saveEditor()
    remote.log('info', '💾 Saved new snapshot version')
  }

  renderVersion(version: Version) {
    const currentFile = this.ctrl.file.currentFile
    this.setState('isSnapshot', true)
    const snapshot = Y.decodeSnapshot(version.snapshot)
    const prevSnapshot = Y.emptySnapshot
    const tr = currentFile?.editorView?.state.tr
    tr?.setMeta(ySyncPluginKey, {snapshot, prevSnapshot})
    currentFile?.editorView?.dispatch(tr!)
  }

  unrenderVersion() {
    const currentFile = this.ctrl.file.currentFile
    const editorState = currentFile?.editorView?.state
    if (!editorState) return
    const binding = ySyncPluginKey.getState(editorState).binding
    if (binding) binding.unrenderSnapshot()
    this.setState('isSnapshot', undefined)
  }

  applyVersion(version: Version) {
    const currentFile = this.ctrl.file.currentFile
    const state = unwrap(this.store)
    const ydoc = state.collab?.ydoc
    const editorView = currentFile?.editorView
    if (!ydoc || !editorView?.state) return

    const snapshot = Y.decodeSnapshot(version.snapshot)
    const newDoc = Y.createDocFromSnapshot(ydoc, snapshot)
    const json = yDocToProsemirrorJSON(newDoc, currentFile?.id)
    const node = Node.fromJSON(editorView.state.schema, json)
    this.unrenderVersion()

    const tr = editorView?.state.tr
    const slice = new Slice(node.content, 0, 0)
    tr!.replace(0, editorView.state.doc.content.size, slice)
    editorView?.dispatch(tr!)
  }
}
