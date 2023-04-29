import {Store} from 'solid-js/store'
import {isTauri, mod} from '@/env'
import * as remote from '@/remote'
import {Mode, State} from '@/state'
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
    if (!isTauri()) return
    window.location.reload()
  }

  private onQuit = () => {
    if (!isTauri()) return
    remote.quit()
  }

  private onNew = () => {
    if (this.store.mode === Mode.Editor) {
      this.ctrl.editor.newFile()
    } else {
      this.ctrl.canvas.newCanvas()
    }

    return true
  }

  private onDiscard = () => {
    if (this.store.mode === Mode.Editor) {
      this.ctrl.editor.discard()
      return true
    }
  }

  private onSave = async () => {
    const currentFile = this.ctrl.file.currentFile
    const state = currentFile?.editorView?.state
    if (!isTauri() || currentFile?.path || !state) return false
    const path = await remote.save(state)
    if (path) this.ctrl.editor.updatePath(path)
  }

  private onFullscreen = () => {
    if (!isTauri()) return
    this.ctrl.app.setFullscreen(!this.store.fullscreen)
    return true
  }

  private onUndo = () => {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile?.editorView) return
    undo(currentFile.editorView.state)
    return true
  }

  private onRedo = () => {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile?.editorView) return
    redo(currentFile.editorView.state)
    return true
  }

  private onPrint = () => {
    if (!isTauri()) return
    window.print()
    return true
  }
}
