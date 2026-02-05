import type {EditorView} from '@codemirror/view'
import {setBlockType} from 'prosemirror-commands'
import {NodeSelection, TextSelection} from 'prosemirror-state'
import {Decoration} from 'prosemirror-view'
import {createEffect, Show} from 'solid-js'
import {foldAll} from '@/codemirror/fold-all'
import {getLanguageNames} from '@/codemirror/highlight'
import {createBlockquote, createCodeFence} from '@/components/assistant/util'
import {TooltipButton, TooltipDivider} from '@/components/dialog/Style'
import {
  IconAdd,
  IconCodeBlocks,
  IconFileSave,
  IconFloatCenter,
  IconFormatClear,
  IconFormatImageLeft,
  IconFormatImageRight,
  IconLanguage,
  IconOpenInNew,
  IconRefresh,
  IconUnfoldLess,
  IconVariableRemove,
  IconVisibility,
  IconVisibilityOff,
} from '@/components/Icon'
import {useDialog} from '@/hooks/use-dialog'
import {useInputLine} from '@/hooks/use-input-line'
import {useOpen} from '@/hooks/use-open'
import editorTextHandling from '@/prompts/editor-text-handling.md?raw'
import editorCodeBlockHandling from '@/prompts/editor-text-handling.md?raw'
import {addDecorationKey} from '@/prosemirror/add-decoration'
import {Align} from '@/prosemirror/image/interfaces'
import {saveSvg} from '@/remote/svg'
import type {ChatMessage} from '@/services/CopilotService'
import {useState} from '@/state'
import {AttachmentType} from '@/types'
import {timeout} from '@/utils/promise'
import type {Block} from './BlockHandle'

interface Props {
  selectedBlock?: Block
  resetBlock: () => void
}

export const BlockTooltip = (props: Props) => {
  const {
    store,
    fileService,
    codeMirrorService,
    configService,
    menuService,
    threadService,
    copilotService,
    toastService,
  } = useState()
  const {openUrl} = useOpen()
  const showInputLine = useInputLine()

  const onPrettify = async () => {
    const block = props.selectedBlock
    if (!block) return
    const view = fileService.currentFile?.editorView
    if (!view) return

    const dom = view.domAtPos(block.blockPos + 1)
    const cmView = (dom as any).node.cmView as EditorView | undefined
    const cmLang = (dom as any).node.cmLanguage as string | undefined
    if (!cmView) return

    await codeMirrorService.format(cmView, cmLang ?? '', configService.prettier)

    view.focus()
    closeTooltip()
  }

  const onFoldAll = () => {
    const block = props.selectedBlock
    if (!block) return
    const view = fileService.currentFile?.editorView
    if (!view) return

    const dom = view.domAtPos(block.blockPos + 1)
    const cmView = (dom as any).node.cmView as EditorView | undefined
    if (!cmView) return
    foldAll(cmView)

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
    showInputLine({
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

  const onCopilotAddToChat = () => {
    const block = props.selectedBlock
    if (!block) return

    const isCodeBlock = block.blockNode.type.name === 'code_block'
    const type = isCodeBlock ? AttachmentType.File : AttachmentType.Text
    const content = isCodeBlock
      ? createCodeFence({
          code: block.blockNode.textContent,
          lang: block.blockNode.attrs.lang,
        })
      : createBlockquote(block.blockNode.textContent)

    menuService.showAssistant()
    threadService.addAttachment({
      type,
      codeLang: block.blockNode.attrs.lang,
      content,
    })

    closeTooltip()
  }

  const onCopilotInline = () => {
    const block = props.selectedBlock
    if (!block) return

    const view = fileService.currentFile?.editorView
    if (!view) return

    const toggleBlink = (remove: boolean = false) => {
      const deco = Decoration.node(block.blockPos, block.blockPos + block.blockNode.nodeSize, {
        class: 'blink',
      })

      const meta = remove ? {remove: [deco]} : {add: [deco]}
      const tr = view.state.tr.setMeta(addDecorationKey, meta)
      view.dispatch(tr)
    }

    showInputLine({
      value: '',
      placeholder: 'Rephrasing by copilot...',
      onEnter: async (text) => {
        const messages: ChatMessage[] = [
          {
            role: 'user',
            content: [
              {type: 'text', text},
              {type: 'text', text: block.blockNode.textContent},
            ],
          },
        ]

        if (block.blockNode.type.name === 'code_block') {
          messages.unshift({
            role: 'system',
            content: [{type: 'text', text: editorCodeBlockHandling}],
          })
        } else {
          messages.unshift({role: 'system', content: [{type: 'text', text: editorTextHandling}]})
        }

        toggleBlink()
        try {
          const answer = await Promise.race([
            copilotService.completionsSync(messages),
            timeout(20_000),
          ])

          toggleBlink(true) // remove blink brefore updating content

          if (answer) {
            const view = fileService.currentFile?.editorView
            if (!view) return
            const tr = view.state.tr
            // replace the contents inside the block not replacing the block itself.
            tr.replaceWith(
              block.blockPos + 1,
              block.blockPos + block.blockNode.nodeSize - 1,
              view.state.schema.text(answer),
            )

            view.dispatch(tr)
          }
        } catch {
          toastService.open({message: 'Failed to get copilot response', duration: 2000})
          toggleBlink(true)
        }
      },
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

  const alignNode = (align: Align) => {
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
    if (!result) {
      closeTooltip()
      return
    }
    showTooltip({anchor: result.dragHandle})
  })

  const Tooltip = () => (
    <>
      {/* Code block actions */}
      <Show when={props.selectedBlock?.blockNode?.type.name === 'code_block'}>
        <Show when={props.selectedBlock?.blockNode.attrs.lang === 'mermaid'}>
          <TooltipButton onClick={onMermaidSave}>
            <IconFileSave /> save as png
          </TooltipButton>
          <TooltipButton onClick={onMermaidHideCode}>
            <Show
              when={props.selectedBlock?.blockNode.attrs.hidden}
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
        <TooltipDivider />
      </Show>
      {/* Copilot actions */}
      <Show when={store.ai?.copilot?.user}>
        <TooltipButton onClick={onCopilotAddToChat} data-testid="copilot_add_to_chat">
          <IconAdd /> Add to copilot chat
        </TooltipButton>
        <TooltipButton onClick={onCopilotInline} data-testid="copilot_ask_inline">
          <IconRefresh /> Rephrasing by copilot
        </TooltipButton>
        <TooltipDivider />
      </Show>
      {/* Image actions */}
      <Show
        when={
          props.selectedBlock?.cursorNode?.type.name === 'image' ||
          props.selectedBlock?.cursorNode?.type.name === 'video'
        }
      >
        <TooltipButton onClick={() => alignNode(Align.FloatLeft)} data-testid="align_float_left">
          <IconFormatImageLeft /> float left
        </TooltipButton>
        <TooltipButton onClick={() => alignNode(Align.FloatRight)} data-testid="align_float_right">
          <IconFormatImageRight /> float right
        </TooltipButton>
        <TooltipButton onClick={() => alignNode(Align.Center)} data-testid="align_center">
          <IconFloatCenter /> center
        </TooltipButton>
        <TooltipDivider />
      </Show>
      {/* Link actions */}
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
    </>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
    onClose: () => props.resetBlock(),
    placement: 'left',
    fallbackPlacements: ['left-start', 'left', 'bottom', 'top'],
  })

  return null
}
