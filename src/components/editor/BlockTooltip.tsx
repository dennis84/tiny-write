import {Show, createEffect, createSignal} from 'solid-js'
import {NodeSelection, TextSelection} from 'prosemirror-state'
import {setBlockType} from 'prosemirror-commands'
import {ReferenceElement} from '@floating-ui/dom'
import {useState} from '@/state'
import {saveSvg} from '@/remote/svg'
import {Align} from '@/prosemirror/image'
import {languages} from '@/codemirror/highlight'
import {useOpen} from '@/open'
import {Icon, IconFloatCenter} from '../Icon'
import {Block} from './BlockHandle'
import {Tooltip} from '../Tooltip'

interface Props {
  selectedBlock?: Block
  resetBlock: () => void
}

export const BlockTooltip = (props: Props) => {
  const {appService, fileService} = useState()
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
    appService.setInputLine({
      value: lang,
      words: Object.keys(languages),
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
    if (href.length > maxLen) return href.substring(0, maxLen) + '…'
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
              <div onClick={onMermaidSave}>
                <Icon>file_save</Icon> save as png
              </div>
              <div onClick={onMermaidHideCode}>
                <Show
                  when={block().blockNode.attrs.hidden}
                  fallback={
                    <>
                      <Icon>visibility_off</Icon> Hide code
                    </>
                  }
                >
                  <Icon>visibility</Icon> Show code
                </Show>
              </div>
              <hr class="divider" />
            </Show>
            <div onClick={onChangeLang} data-testid="change_lang">
              <Icon>javascript</Icon> change language
            </div>
            <div onClick={onPrettify} data-testid="prettify">
              <Icon>code_blocks</Icon> prettify
            </div>
            <div onClick={onFoldAll}>
              <Icon>unfold_less</Icon> fold all
            </div>
            <hr class="divider" />
          </Show>
          <Show
            when={
              block().cursorNode?.type.name === 'image' || block().cursorNode?.type.name === 'video'
            }
          >
            <div onClick={onAlign(Align.FloatLeft)} data-testid="align_float_left">
              <Icon>format_image_left</Icon> float left
            </div>
            <div onClick={onAlign(Align.FloatRight)} data-testid="align_float_right">
              <Icon>format_image_right</Icon> float right
            </div>
            <div onClick={onAlign(Align.Center)} data-testid="align_center">
              <IconFloatCenter /> center
            </div>
            <hr class="divider" />
          </Show>
          <Show when={getLinkHref()}>
            {(href) => (
              <>
                <div onClick={onOpenLink} data-testid="open_link">
                  <Icon>open_in_new</Icon> open: {href()}
                </div>
                <hr class="divider" />
              </>
            )}
          </Show>
          <div onClick={onToPlain}>
            <Icon>format_clear</Icon> remove text formats
          </div>
          <div onClick={onRemoveBlock} data-testid="remove_block">
            <Icon>variable_remove</Icon> remove block
          </div>
        </Tooltip>
      )}
    </Show>
  )
}
