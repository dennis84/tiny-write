import {onCleanup, onMount} from 'solid-js'
import {keyName} from 'w3c-keyname'
import {isCodeElement, isEditorElement, Page, useState} from '@/state'
import {isTauri, mod} from '@/env'
import {saveFile} from '@/remote/editor'
import {quit} from '@/remote/app'
import {lspGoto} from '@/remote/lsp'
import {useOpen} from '@/hooks/open'

export const Keymap = () => {
  const {
    store,
    appService,
    editorService,
    fileService,
    collabService,
    canvasService,
    canvasCollabService,
    treeService,
  } = useState()
  const {open} = useOpen()

  onMount(() => {
    document.addEventListener('keydown', onKeyDown)
    onCleanup(() => {
      document.removeEventListener('keydown', onKeyDown)
    })
  })

  const stopEvent = () => {
    return document.activeElement?.hasAttribute('contenteditable')
  }

  const modifiers = (name: string, event: KeyboardEvent, shift = true) => {
    if (event.altKey) name = `Alt-${name}`
    if (event.ctrlKey) name = `Ctrl-${name}`
    if (event.metaKey) name = `Meta-${name}`
    if (shift && event.shiftKey) name = `Shift-${name}`
    return name
  }

  const onReload = () => {
    if (!isTauri()) return false
    window.location.reload()
    return true
  }

  const onQuit = async () => {
    if (!isTauri()) return
    await quit()
  }

  const onNew = async () => {
    if (store.lastLocation?.page === Page.Editor) {
      const file = await fileService.newFile()
      treeService.add(file)
      open(file)
    } else {
      const el = await canvasService.newFile()
      if (el) {
        canvasCollabService.addElement(el)
        const file = fileService.findFileById(el.id)
        if (file) treeService.add(file)
      }
    }
  }

  const onClear = async () => {
    if (store.lastLocation?.page === Page.Editor) {
      await editorService.clear()
    }
  }

  const onSave = async () => {
    const currentFile = fileService.currentFile
    if (!isTauri() || !currentFile || currentFile?.path) return false
    const path = await saveFile(currentFile)
    if (path) await fileService.updatePath(currentFile.id, path)
  }

  const onFullscreen = async () => {
    if (!isTauri()) return false
    await appService.setFullscreen(!store.fullscreen)
    return true
  }

  const onUndo = () => {
    collabService.undoManager?.undo()
    return true
  }

  const onRedo = () => {
    collabService.undoManager?.redo()
    return true
  }

  const onPrint = () => {
    if (!isTauri()) return
    window.print()
    return true
  }

  const onBackspace = async () => {
    if (store.lastLocation?.page !== Page.Canvas || stopEvent()) return false

    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return false

    const elementIds: string[] = []
    const selection = canvasService.selection

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

    const removed = await canvasService.removeElements(elementIds)
    canvasCollabService.removeMany(removed)
    return true
  }

  const onGoto = async () => {
    const currentFile = fileService.currentFile
    const path = currentFile?.path
    const codeEditorView = currentFile?.codeEditorView
    if (!codeEditorView || !path) return

    const sel = codeEditorView.state.selection.main

    const response = await lspGoto(path, sel.from)

    const first = response?.[0] // file:///Users/../file.ts
    if (!first) return

    const url = new URL(first.uri)
    const selection = first.range

    const file = await fileService.newFileByPath(url.pathname)

    open(file, {back: true, selection})
  }

  type Fn = (e: KeyboardEvent) => boolean | undefined | Promise<boolean | undefined>
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
    [`${mod}-d`]: onGoto,
    Backspace: onBackspace,
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
