import {onCleanup, onMount} from 'solid-js'
import {keyName} from 'w3c-keyname'
import {isEditorElement, Mode, useState} from '@/state'
import {isTauri, mod} from '@/env'
import * as remote from '@/remote'
import {redo, undo} from 'y-prosemirror'

export default () => {
  const [store, ctrl] = useState()

  onMount(() => {
    document.addEventListener('keydown', onKeyDown)
    onCleanup(() => {
      document.removeEventListener('keydown', onKeyDown)
    })
  })

  const modifiers = (name: string, event: KeyboardEvent, shift = true) => {
    if (event.altKey) name = 'Alt-' + name
    if (event.ctrlKey) name = 'Ctrl-' + name
    if (event.metaKey) name = 'Meta-' + name
    if (shift && event.shiftKey) name = 'Shift-' + name
    return name
  }

  const onReload = () => {
    if (!isTauri()) return false
    window.location.reload()
    return true
  }

  const onQuit = () => {
    if (!isTauri()) return
    remote.quit()
  }

  const onNew = () => {
    if (store.mode === Mode.Editor) {
      ctrl.editor.newFile()
    } else {
      ctrl.canvas.newCanvas()
    }
  }

  const onDiscard = () => {
    if (store.mode === Mode.Editor) {
      ctrl.editor.discard()
    }
  }

  const onSave = async () => {
    const currentFile = ctrl.file.currentFile
    const state = currentFile?.editorView?.state
    if (!isTauri() || currentFile?.path || !state) return false
    const path = await remote.save(state)
    if (path) ctrl.editor.updatePath(path)
  }

  const onFullscreen = () => {
    if (!isTauri()) return false
    ctrl.app.setFullscreen(!store.fullscreen)
    return true
  }

  const onUndo = () => {
    const currentFile = ctrl.file.currentFile
    if (!currentFile?.editorView) return
    undo(currentFile.editorView.state)
    return true
  }

  const onRedo = () => {
    const currentFile = ctrl.file.currentFile
    if (!currentFile?.editorView) return
    redo(currentFile.editorView.state)
    return true
  }

  const onPrint = () => {
    if (!isTauri()) return
    window.print()
    return true
  }

  const onBackspace = () => {
    if (store.mode !== Mode.Canvas) return false

    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return false

    const selected = currentCanvas.elements.find((el) => {
      if (isEditorElement(el)) return el.selected && !el.active
      return el.selected
    })

    if (!selected) return false
    ctrl.canvas.removeElement(selected.id)
    return true
  }

  type Fn = (e: KeyboardEvent) => boolean | void
  const keymap: Record<string, Fn> = {
    [`${mod}-r`]: onReload,
    [`${mod}-q`]: onQuit,
    [`${mod}-n`]: onNew,
    [`${mod}-w`]: onDiscard,
    [`${mod}-s`]: onSave,
    [`${mod}-Enter`]: onFullscreen,
    'Alt-Enter': onFullscreen,
    [`${mod}-z`]: onUndo,
    [`Shift-${mod}-Z`]: onRedo,
    [`${mod}-y`]: onRedo,
    [`${mod}-p`]: onPrint,
    'Backspace': onBackspace,
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const n = keyName(e)
    const k = modifiers(n, e)
    const r = keymap[k]?.(e)
    if (r) e.preventDefault()
  }

  return <></>
}
