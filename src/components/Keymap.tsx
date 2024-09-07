import {onCleanup, onMount} from 'solid-js'
import {useNavigate} from '@solidjs/router'
import {keyName} from 'w3c-keyname'
import {isCodeElement, isEditorElement, Mode, useState} from '@/state'
import {isTauri, mod} from '@/env'
import * as remote from '@/remote'

export const Keymap = () => {
  const [store, ctrl] = useState()
  const navigate = useNavigate()

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

  const onQuit = async () => {
    if (!isTauri()) return
    await remote.quit()
  }

  const onNew = async () => {
    if (store.mode === Mode.Editor) {
      const file = await ctrl.editor.newFile()
      navigate(`/editor/${file.id}`)
    } else {
      const el = await ctrl.canvas.newFile()
      if (el) ctrl.canvasCollab.addElement(el)
    }
  }

  const onClear = async () => {
    if (store.mode === Mode.Editor) {
      await ctrl.editor.clear()
    }
  }

  const onSave = async () => {
    const currentFile = ctrl.file.currentFile
    if (!isTauri() || !currentFile || currentFile?.path) return false
    const path = await remote.saveFile(currentFile)
    if (path) await ctrl.editor.updatePath(path)
  }

  const onFullscreen = async () => {
    if (!isTauri()) return false
    await ctrl.app.setFullscreen(!store.fullscreen)
    return true
  }

  const onUndo = () => {
    ctrl.collab.undoManager?.undo()
    return true
  }

  const onRedo = () => {
    ctrl.collab.undoManager?.redo()
    return true
  }

  const onPrint = () => {
    if (!isTauri()) return
    window.print()
    return true
  }

  const onBackspace = async () => {
    if (store.mode !== Mode.Canvas) return false

    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return false

    const elementIds: string[] = []
    const selection = ctrl.canvas.selection

    if (selection) {
      selection.elements.forEach(([id]) => elementIds.push(id))
    } else {
      const selected = currentCanvas.elements.find((el) => {
        if (isEditorElement(el)) return el.selected && !el.active
        else if (isCodeElement(el)) return el.selected && !el.active
        else return el.selected
      })

      if (!selected) return false
      elementIds.push(selected.id)
    }

    const removed = await ctrl.canvas.removeElements(elementIds)
    ctrl.canvasCollab.removeMany(removed)
    return true
  }

  type Fn = (e: KeyboardEvent) => boolean | void | Promise<boolean | void>
  const keymap: Record<string, Fn> = {
    [`${mod}-r`]: onReload,
    [`${mod}-q`]: onQuit,
    [`${mod}-n`]: onNew,
    [`${mod}-w`]: onClear,
    [`${mod}-s`]: onSave,
    [`${mod}-Enter`]: onFullscreen,
    'Alt-Enter': onFullscreen,
    [`${mod}-z`]: onUndo,
    [`Shift-${mod}-Z`]: onRedo,
    [`${mod}-y`]: onRedo,
    [`${mod}-p`]: onPrint,
    'Backspace': onBackspace,
  }

  const onKeyDown = async (e: KeyboardEvent) => {
    const n = keyName(e)
    const k = modifiers(n, e)
    let r = keymap[k]?.(e) as any
    if (r instanceof Promise) r = await r
    if (r) e.preventDefault()
  }

  return <></>
}
