import {Show, createEffect, createSignal} from 'solid-js'
import {NodeSelection, TextSelection} from 'prosemirror-state'
import {setBlockType} from 'prosemirror-commands'
import type {ReferenceElement} from '@floating-ui/dom'
import {v4 as uuidv4} from 'uuid'
import {MessageType, useState} from '@/state'
import {saveSvg} from '@/remote/svg'
import {Align} from '@/prosemirror/image'
import {getLanguageNames} from '@/codemirror/highlight'
import {useOpen} from '@/hooks/open'
import {
  IconAiAssistant,
  IconCodeBlocks,
  IconFileSave,
  IconFloatCenter,
  IconFormatClear,
  IconFormatImageLeft,
  IconFormatImageRight,
  IconLanguage,
  IconOpenInNew,
  IconUnfoldLess,
  IconVariableRemove,
  IconVisibility,
  IconVisibilityOff,
} from '@/components/Icon'
import {Tooltip, TooltipButton, TooltipDivider} from '@/components/Tooltip'
import {createCodeFence} from '@/components/assistant/util'
import type {Block} from './BlockHandle'

interface Props {
  selectedBlock?: Block
  resetBlock: () => void
}

export const BlockTooltip = (props: Props) => {
  const {fileService, menuService, threadService, inputLineService} = useState()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<ReferenceElement | undefined>()
  const {openUrl} = useOpen()

  const closeTooltip = () => {
    props.resetBlock()
    setTooltipAnchor(undefined)
  }

  const onPrettify = () => {
    const block = props.selectedBlock
    if (!block) return
    const view = fileService.currentFile?.editorView
    if (!view) return

    const dom = view.domAtPos(block.blockPos + 1)
    dom.node.dispatchEvent(
      new CustomEvent('cm:user_event', {
        detail: {userEvent: 'prettify'},
      }),
    )

    view.focus()
    closeTooltip()
  }

  const onFoldAll = () => {
    const block = props.selectedBlock
    if (!block) return
    const view = fileService.currentFile?.editorView
    if (!view) return
    const dom = view.domAtPos(block.blockPos + 1)
    dom.node.dispatchEvent(
      new CustomEvent('cm:user_event', {
        detail: {userEvent: 'fold_all'},
      }),
    )

    view.focus()
    closeTooltip()
  }

  const onChangeLang = () => {
    const block = props.selectedBlock
    if (!block) return

    const view = fileService.currentFile?.editorView
    if (!view) return

    if (block.blockNode.attrs.lang === 'mermaid') {
      const tr = view.state.tr
      tr.setNodeAttribute(block.blockPos, 'hidden', false)
      view.dispatch(tr)
    }

    const lang = block.blockNode.attrs.lang
    inputLineService.setInputLine({
      value: lang,
      words: getLanguageNames(),
      onEnter: (lang: string) => {
        view.focus()
        const tr = view.state.tr
        const pos = tr.doc.resolve(block.cursorPos ?? block.blockPos)
        tr.setSelection(new TextSelection(pos))
        tr.setNodeAttribute(block.blockPos, 'lang', lang)
        view.dispatch(tr)
      },
    })

    closeTooltip()
  }

  const onMermaidSave = async () => {
    const block = props.selectedBlock
    if (!block) return

    const id = `mermaid-graph-${block.blockPos}`
    const svg = document.getElementById(id)
    if (svg) await saveSvg(svg)
    closeTooltip()
  }

  const onMermaidHideCode = () => {
    const block = props.selectedBlock
    if (!block) return

    const view = fileService.currentFile?.editorView
    if (!view) return

    const tr = view.state.tr
    tr.setNodeAttribute(block.blockPos, 'hidden', !block.blockNode.attrs.hidden)
    view.dispatch(tr)
    view.focus()
    closeTooltip()
  }

  const onCopilot = () => {
    const block = props.selectedBlock
    if (!block) return

    menuService.showAssistant()
    threadService.addMessage({
      id: uuidv4(),
      role: 'user',
      type: MessageType.File,
      codeLang: block.blockNode.attrs.lang,
      content: createCodeFence({
        code: block.blockNode.textContent,
        lang: block.blockNode.attrs.lang,
      }),
    })

    closeTooltip()
  }

  const onToPlain = () => {
    const block = props.selectedBlock
    if (!block) return

    const view = fileService.currentFile?.editorView
    if (!view) return

    const pos = view.state.doc.resolve(block.blockPos)

    // select block
    const selectionTr = view.state.tr
    selectionTr.setSelection(NodeSelection.near(pos))
    view.dispatch(selectionTr)

    // set blocktype to paragraph
    const toPlain = setBlockType(view.state.schema.nodes.paragraph)
    toPlain(view.state, view.dispatch)

    // remove marks
    const removeMarkTr = view.state.tr
    if (!pos.nodeAfter) return
    removeMarkTr.removeMark(pos.pos, pos.pos + pos.nodeAfter.nodeSize)
    view.dispatch(removeMarkTr)

    view.focus()
    closeTooltip()
  }

  const onRemoveBlock = () => {
    const block = props.selectedBlock
    if (!block) return

    const view = fileService.currentFile?.editorView
    if (!view) return

    const tr = view.state.tr
    tr.setSelection(NodeSelection.create(view.state.doc, block.blockPos))
    tr.deleteSelection()
    view.dispatch(tr)
    view.focus()

    closeTooltip()
  }

  const onAlign = (align: Align) => () => {
    const block = props.selectedBlock
    if (block?.cursorPos === undefined) return

    const view = fileService.currentFile?.editorView
    if (!view) return

    const tr = view.state.tr
    tr.setNodeAttribute(block.cursorPos, 'align', align)

    view.dispatch(tr)
    closeTooltip()
  }

  const onOpenLink = async () => {
    const block = props.selectedBlock
    if (block?.cursorPos === undefined) return
    const view = fileService.currentFile?.editorView
    if (!view) return

    const resolved = view.state.doc.resolve(block.cursorPos)
    const href = resolved.marks()[0]?.attrs?.href
    if (!href) return

    await openUrl(href)
    closeTooltip()
  }

  const getLinkHref = (): string | undefined => {
    const block = props.selectedBlock
    if (!block?.cursorNode?.marks) return

    const view = fileService.currentFile?.editorView
    if (!view) return

    const mark =
      view.state.schema.marks.link.isInSet(block.cursorNode?.marks ?? []) ||
      view.state.schema.marks.edit_link.isInSet(block.cursorNode?.marks ?? [])
    const href = mark?.attrs.href
    const maxLen = 20

    if (!href) return
    if (href.length > maxLen) return `${href.substring(0, maxLen)}…`
    return href
  }

  createEffect(() => {
    const result = props.selectedBlock
    if (!result) return
    setTooltipAnchor(result.dragHandle)
  })

  return (
    <Show when={props.selectedBlock}>
      {(block) => (
        <Tooltip
          anchor={tooltipAnchor()!}
          onClose={closeTooltip}
          placement="left"
          fallbackPlacements={['left-start', 'left', 'bottom', 'top']}
        >
          <Show when={block().blockNode?.type.name === 'code_block'}>
            <Show when={block().blockNode.attrs.lang === 'mermaid'}>
              <TooltipButton onClick={onMermaidSave}>
                <IconFileSave /> save as png
              </TooltipButton>
              <TooltipButton onClick={onMermaidHideCode}>
                <Show
                  when={block().blockNode.attrs.hidden}
                  fallback={
                    <>
                      <IconVisibilityOff /> Hide code
                    </>
                  }
                >
                  <IconVisibility /> Show code
                </Show>
              </TooltipButton>
              <TooltipDivider />
            </Show>
            <TooltipButton onClick={onChangeLang} data-testid="change_lang">
              <IconLanguage /> change language
            </TooltipButton>
            <TooltipButton onClick={onPrettify} data-testid="prettify">
              <IconCodeBlocks /> prettify
            </TooltipButton>
            <TooltipButton onClick={onFoldAll}>
              <IconUnfoldLess /> fold all
            </TooltipButton>
            <TooltipButton onClick={onCopilot}>
              <IconAiAssistant /> Ask copilot
            </TooltipButton>
            <TooltipDivider />
          </Show>
          <Show
            when={
              block().cursorNode?.type.name === 'image' || block().cursorNode?.type.name === 'video'
            }
          >
            <TooltipButton onClick={onAlign(Align.FloatLeft)} data-testid="align_float_left">
              <IconFormatImageLeft /> float left
            </TooltipButton>
            <TooltipButton onClick={onAlign(Align.FloatRight)} data-testid="align_float_right">
              <IconFormatImageRight /> float right
            </TooltipButton>
            <TooltipButton onClick={onAlign(Align.Center)} data-testid="align_center">
              <IconFloatCenter /> center
            </TooltipButton>
            <TooltipDivider />
          </Show>
          <Show when={getLinkHref()}>
            {(href) => (
              <>
                <TooltipButton onClick={onOpenLink} data-testid="open_link">
                  <IconOpenInNew /> open: {href()}
                </TooltipButton>
                <TooltipDivider />
              </>
            )}
          </Show>
          <TooltipButton onClick={onToPlain}>
            <IconFormatClear /> remove text formats
          </TooltipButton>
          <TooltipButton onClick={onRemoveBlock} data-testid="remove_block">
            <IconVariableRemove /> remove block
          </TooltipButton>
        </Tooltip>
      )}
    </Show>
  )
}
