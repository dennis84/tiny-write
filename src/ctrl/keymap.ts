import {Store} from 'solid-js/store'
import {Ctrl} from '@/ctrl'
import {isTauri, mod} from '@/env'
import * as remote from '@/remote'
import {State} from '@/state'
import {redo, undo} from 'y-prosemirror'

export class Keymap {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
  ) {}

  onReload = () => {
    if (!isTauri) return
    window.location.reload()
  }

  onQuit = () => {
    if (!isTauri) return
    remote.quit()
  }

  onNew = () => {
    this.ctrl.editor.newFile()
    return true
  }

  onDiscard = () => {
    this.ctrl.editor.discard()
    return true
  }

  onSave = async () => {
    const state = this.store.editor?.editorView?.state
    if (!isTauri || this.store.editor?.path || !state) return false
    const path = await remote.save(state)
    if (path) this.ctrl.editor.updatePath(path)
  }

  onFullscreen = () => {
    if (!isTauri) return
    this.ctrl.app.setFullscreen(!this.store.fullscreen)
    return true
  }

  onUndo = () => {
    if (!this.store.editor?.editorView) return
    undo(this.store.editor.editorView.state)
    return true
  }

  onRedo = () => {
    if (!this.store.editor?.editorView) return
    redo(this.store.editor.editorView.state)
    return true
  }

  onPrint = () => {
    if (!isTauri) return
    window.print()
    return true
  }

  create() {
    return {
      [`${mod}-r`]: this.onReload,
      [`${mod}-q`]: this.onQuit,
      [`${mod}-n`]: this.onNew,
      [`${mod}-w`]: this.onDiscard,
      [`${mod}-s`]: this.onSave,
      'Cmd-Enter': this.onFullscreen,
      'Alt-Enter': this.onFullscreen,
      [`${mod}-z`]: this.onUndo,
      [`Shift-${mod}-z`]: this.onRedo,
      [`${mod}-y`]: this.onRedo,
      [`${mod}-p`]: this.onPrint,
    }
  }
}
