import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {Slice} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirror, ySyncPluginKey} from 'y-prosemirror'
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
    const state = unwrap(this.store)
    const ydoc = state.collab?.ydoc
    if (!ydoc) return

    const versions = ydoc.getArray<Version>('versions')
    const prevVersion = versions.get(versions.length - 1)
    const prevSnapshot = prevVersion ? Y.decodeSnapshot(prevVersion.snapshot) : Y.emptySnapshot
    const snapshot = Y.snapshot(ydoc)

    if (prevVersion) {
      prevSnapshot.sv.set(prevVersion.clientID, (prevSnapshot.sv.get(prevVersion.clientID))! + 1)
    }

    if (!Y.equalSnapshots(prevSnapshot, snapshot)) {
      versions.push([{
        date: state.editor?.lastModified?.getTime() ?? 0,
        snapshot: Y.encodeSnapshot(snapshot),
        clientID: ydoc.clientID,
      }])
    }

    this.ctrl.editor.saveEditor(state)
    remote.log('info', '💾 Saved new snapshot version')
  }

  renderVersion(version: Version) {
    this.setState('isSnapshot', true)
    const snapshot = Y.decodeSnapshot(version.snapshot)
    const prevSnapshot = Y.emptySnapshot
    const tr = this.store.editor?.editorView?.state.tr
    tr?.setMeta(ySyncPluginKey, {snapshot, prevSnapshot})
    this.store.editor?.editorView?.dispatch(tr!)
  }

  unrenderVersion() {
    const state = unwrap(this.store)
    const editorState = state.editor?.editorView?.state
    if (!editorState) return
    const binding = ySyncPluginKey.getState(editorState).binding
    if (binding) binding.unrenderSnapshot()
    this.setState('isSnapshot', undefined)
  }

  applyVersion(version: Version) {
    const state = unwrap(this.store)
    const ydoc = state.collab?.ydoc
    const editorView = state.editor?.editorView
    if (!ydoc || !editorView?.state) return

    const snapshot = Y.decodeSnapshot(version.snapshot)
    const newDoc = Y.createDocFromSnapshot(ydoc, snapshot)
    const node = yDocToProsemirror(editorView.state.schema, newDoc)
    this.unrenderVersion()

    const tr = editorView?.state.tr
    const slice = new Slice(node.content, 0, 0)
    tr!.replace(0, editorView.state.doc.content.size, slice)
    editorView?.dispatch(tr!)
  }
}
