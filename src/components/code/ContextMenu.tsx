import {toggleComment} from '@codemirror/commands'
import {onMount} from 'solid-js'
import {useDialog} from '@/hooks/use-dialog'
import {copy, readText} from '@/remote/clipboard'
import {useState} from '@/state'
import {TooltipButton, TooltipDivider} from '../dialog/Style'

interface Props {
  area: () => HTMLElement
}

export const ContextMenu = (props: Props) => {
  const {fileService} = useState()

  const Tooltip = () => (
    <>
      <TooltipButton onClick={onCut}>Cut</TooltipButton>
      <TooltipButton onClick={onCopy}>Copy</TooltipButton>
      <TooltipButton onClick={onPaste}>Paste</TooltipButton>
      <TooltipDivider />
      <TooltipButton onClick={onToggleComment}>Toggle comment</TooltipButton>
    </>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

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
    closeTooltip()
  }

  const onCut = async () => {
    const text = getSelectedText()
    if (text) await copy(text)
    const view = fileService.currentFile?.codeEditorView
    if (!view) return
    view.dispatch(view.state.replaceSelection(''))
    closeTooltip()
  }

  const onPaste = async () => {
    const view = fileService.currentFile?.codeEditorView
    if (!view) return
    const text = await readText()
    view.dispatch(view.state.replaceSelection(text))
    closeTooltip()
  }

  const onToggleComment = () => {
    const currentFile = fileService.currentFile
    if (!currentFile?.codeEditorView) return
    toggleComment(currentFile.codeEditorView)
    closeTooltip()
  }

  onMount(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as Element
      if (!props.area().contains(target)) return

      e.preventDefault()
      const x = e.clientX
      const y = e.clientY
      showTooltip({
        anchor: {
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
        },
      })
    }

    document.oncontextmenu = onContextMenu
  })

  return null
}
