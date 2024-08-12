import {Show, createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {createMutable, unwrap} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import {NodeSelection, TextSelection} from 'prosemirror-state'
import {setBlockType} from 'prosemirror-commands'
import {arrow, autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom'
import {useState} from '@/state'
import * as remote from '@/remote'
import {isTauri} from '@/env'
import {Align} from '@/prosemirror/image'
import {InputLine, InputLineConfig} from '@/components/dialog/InputLine'
import {Icon} from '../Icon'
import {Block} from './BlockHandle'

const TooltipEl = styled('div')`
  position: absolute;
  z-index: var(--z-index-max);
`

interface Cleanup {
  fn?: () => void
}

interface Props {
  selectedBlock?: Block
  resetBlock: () => void
}

export const BlockTooltip = (props: Props) => {
  let tooltipRef!: HTMLDivElement
  let arrowRef!: HTMLSpanElement

  const [, ctrl] = useState()
  const [inputLine, setInputLine] = createSignal<InputLineConfig>()
  const cleanup = createMutable<Cleanup>({})

  const closeTooltip = () => {
    props.resetBlock()
  }

  const onPrettify = () => {
    const block = props.selectedBlock
    if (!block) return
    const view = ctrl.file.currentFile?.editorView
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
    const view = ctrl.file.currentFile?.editorView
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

    const view = ctrl.file.currentFile?.editorView
    if (!view) return

    if (block.blockNode.attrs.lang === 'mermaid') {
      const tr = view.state.tr
      tr.setNodeAttribute(block.blockPos, 'hidden', false)
      view.dispatch(tr)
    }

    const lang = block.blockNode.attrs.lang
    setInputLine({
      value: lang,
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
    if (svg) await remote.saveSvg(svg)
    closeTooltip()
  }

  const onMermaidHideCode = () => {
    const block = props.selectedBlock
    if (!block) return

    const view = ctrl.file.currentFile?.editorView
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

    const view = ctrl.file.currentFile?.editorView
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

    const view = ctrl.file.currentFile?.editorView
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

    const view = ctrl.file.currentFile?.editorView
    if (!view) return

    const tr = view.state.tr
    tr.setNodeAttribute(block.cursorPos, 'align', align)

    view.dispatch(tr)
    closeTooltip()
  }

  const onOpenLink = async () => {
    const block = props.selectedBlock
    if (block?.cursorPos === undefined) return
    const view = ctrl.file.currentFile?.editorView
    if (!view) return

    const resolved = view.state.doc.resolve(block.cursorPos)
    const href = resolved.marks()[0]?.attrs?.href
    if (!href) return

    if (!isTauri()) {
      await remote.open(href)
      return
    }

    try {
      const url = new URL(href)
      await remote.open(url.href)
      closeTooltip()
      return
    } catch (_e) {
      // ...
    }

    const basePath = await ctrl.app.getBasePath()
    const path = await remote.resolvePath(href, basePath)
    const mime = await remote.getMimeType(path)

    if (mime.startsWith('text/')) {
      await ctrl.editor.openFileByPath(path)
    } else {
      await remote.open(path)
    }

    closeTooltip()
  }

  const getLinkHref = (): string | undefined => {
    const block = props.selectedBlock
    if (!block?.cursorNode?.marks) return

    const view = ctrl.file.currentFile?.editorView
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

  const onBackgroundClick = (e: MouseEvent) => {
    const block = props.selectedBlock
    if (!block) return

    const view = ctrl.file.currentFile?.editorView
    if (!view) return

    if (tooltipRef.contains(e.target as Element)) return

    props.resetBlock()
  }

  createEffect(() => {
    const result = props.selectedBlock
    if (!result) return

    unwrap(cleanup).fn?.()
    cleanup.fn = autoUpdate(result.dragHandle, tooltipRef, async () => {
      return computePosition(result.dragHandle, tooltipRef, {
        placement: 'left',
        middleware: [
          offset(10),
          flip({fallbackPlacements: ['left', 'bottom', 'top']}),
          shift(),
          arrow({element: arrowRef}),
        ],
      }).then(({x, y, placement, middlewareData}) => {
        tooltipRef.style.left = `${x}px`
        tooltipRef.style.top = `${y}px`
        const side = placement.split('-')[0]
        const staticSide =
          {
            top: 'bottom',
            right: 'left',
            bottom: 'top',
            left: 'right',
          }[side] ?? 'top'

        if (middlewareData.arrow) {
          const {x, y} = middlewareData.arrow
          arrowRef.classList.add(staticSide)
          Object.assign(arrowRef.style, {
            left: x != null ? `${x}px` : '',
            top: y != null ? `${y}px` : '',
            [staticSide]: `${-arrowRef.offsetWidth / 2}px`,
          })
        }
      })
    })
  })

  onMount(() => {
    document.addEventListener('mousedown', onBackgroundClick)
  })

  onCleanup(() => {
    cleanup.fn?.()
    document.removeEventListener('mousedown', onBackgroundClick)
  })

  return (
    <>
      <Show when={props.selectedBlock}>
        {(block) => (
          <>
            <TooltipEl ref={tooltipRef} id="block-tooltip" class="block-tooltip">
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
                  block().cursorNode?.type.name === 'image' ||
                  block().cursorNode?.type.name === 'video'
                }
              >
                <div onClick={onAlign(Align.FloatLeft)} data-testid="align_float_left">
                  <Icon>format_image_left</Icon> float left
                </div>
                <div onClick={onAlign(Align.FloatRight)} data-testid="align_float_right">
                  <Icon>format_image_right</Icon> float right
                </div>
                <div onClick={onAlign(Align.Center)} data-testid="align_center">
                  <Icon>panorama</Icon> center
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
              <span ref={arrowRef} class="arrow"></span>
            </TooltipEl>
          </>
        )}
      </Show>
      <InputLine getter={inputLine} setter={setInputLine} />
    </>
  )
}
