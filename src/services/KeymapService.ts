import {Store} from 'solid-js/store'
import {isTauri, mod} from '@/env'
import * as remote from '@/remote'
import {State} from '@/state'
import {redo, undo} from 'y-prosemirror'
import {Ctrl} from '.'

export class KeymapService {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
  ) {}

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

  private onReload = () => {
    if (!isTauri) return
    window.location.reload()
  }

  private onQuit = () => {
    if (!isTauri) return
    remote.quit()
  }

  private onNew = () => {
    this.ctrl.editor.newFile()
    return true
  }

  private onDiscard = () => {
    this.ctrl.editor.discard()
    return true
  }

  private onSave = async () => {
    const state = this.store.editor?.editorView?.state
    if (!isTauri || this.ctrl.editor.currentFile?.path || !state) return false
    const path = await remote.save(state)
    if (path) this.ctrl.editor.updatePath(path)
  }

  private onFullscreen = () => {
    if (!isTauri) return
    this.ctrl.app.setFullscreen(!this.store.fullscreen)
    return true
  }

  private onUndo = () => {
    if (!this.store.editor?.editorView) return
    undo(this.store.editor.editorView.state)
    return true
  }

  private onRedo = () => {
    if (!this.store.editor?.editorView) return
    redo(this.store.editor.editorView.state)
    return true
  }

  private onPrint = () => {
    if (!isTauri) return
    window.print()
    return true
  }
}
