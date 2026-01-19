import {toggleComment} from '@codemirror/commands'
import type {ReferenceElement} from '@floating-ui/dom'
import {createSignal, onMount, Show} from 'solid-js'
import {copy, readText} from '@/remote/clipboard'
import {useState} from '@/state'
import {Tooltip, TooltipButton, TooltipDivider} from '../dialog/Tooltip'

export const ContextMenu = () => {
  const [contextMenu, setContextMenu] = createSignal<ReferenceElement | undefined>()
  const {fileService} = useState()

  const onTooltipClose = () => {
    setContextMenu(undefined)
  }

  const getSelectedText = () => {
    const currentFile = fileService.currentFile
    if (!currentFile?.codeEditorView) return
    const state = currentFile.codeEditorView.state
    const sel = state.selection.main
    return state.sliceDoc(sel.from, sel.to)
  }

  const onCopy = async () => {
    const text = getSelectedText()
    if (text) await copy(text)
    setContextMenu(undefined)
  }

  const onCut = async () => {
    const text = getSelectedText()
    if (text) await copy(text)
    const view = fileService.currentFile?.codeEditorView
    if (!view) return
    view.dispatch(view.state.replaceSelection(''))
    setContextMenu(undefined)
  }

  const onPaste = async () => {
    const view = fileService.currentFile?.codeEditorView
    if (!view) return
    const text = await readText()
    view.dispatch(view.state.replaceSelection(text))
    setContextMenu(undefined)
  }

  const onToggleComment = () => {
    const currentFile = fileService.currentFile
    if (!currentFile?.codeEditorView) return
    toggleComment(currentFile.codeEditorView)
    setContextMenu(undefined)
  }

  onMount(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      const x = e.clientX
      const y = e.clientY
      setContextMenu({
        getBoundingClientRect() {
          return {
            x,
            y,
            top: y,
            left: x,
            bottom: y,
            right: x,
            width: 1,
            height: 1,
          }
        },
      })
    }

    document.oncontextmenu = onContextMenu
  })

  return (
    <Show when={contextMenu()} keyed>
      {(tooltipAnchor) => (
        <Tooltip anchor={tooltipAnchor} onClose={onTooltipClose} backdrop={true}>
          <TooltipButton onClick={onCut}>Cut</TooltipButton>
          <TooltipButton onClick={onCopy}>Copy</TooltipButton>
          <TooltipButton onClick={onPaste}>Paste</TooltipButton>
          <TooltipDivider />
          <TooltipButton onClick={onToggleComment}>Toggle comment</TooltipButton>
        </Tooltip>
      )}
    </Show>
  )
}
