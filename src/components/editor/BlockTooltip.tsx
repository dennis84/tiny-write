import {Show, createEffect, createMemo, createSignal, onCleanup, onMount} from 'solid-js'
import {createMutable, unwrap} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import {NodeSelection, TextSelection} from 'prosemirror-state'
import {Node} from 'prosemirror-model'
import {setBlockType} from 'prosemirror-commands'
import {arrow, autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom'
import {useState} from '@/state'
import * as remote from '@/remote'
import {isTauri} from '@/env'
import {Align} from '@/prosemirror/image'
import {blockHandlePluginKey} from '@/prosemirror/block-handle'
import {InputLine, InputLineConfig} from '@/components/dialog/InputLine'
import {Icon} from '../Icon'

const TooltipEl = styled('div')`
  position: absolute;
  z-index: 100;
`

interface Block {
  blockPos: number
  blockNode: Node
  cursorPos?: number
  cursorNode?: Node
}

interface Cleanup {
  fn?: () => void
}

export const BlockTooltip = () => {
  let tooltipRef!: HTMLDivElement
  let arrowRef!: HTMLSpanElement

  const [store, ctrl] = useState()
  const [selectedBlock, setSelectedBlock] = createSignal<Block | undefined>()
  const [inputLine, setInputLine] = createSignal<InputLineConfig>()
  const cleanup = createMutable<Cleanup>({})

  const closeTooltip = () => {
    setSelectedBlock(undefined)

    const blockHandleState = getBlockHandleState()
    const view = ctrl.file.currentFile?.editorView
    if (!view) return

    const tr = view.state.tr
    tr.setMeta(blockHandlePluginKey, {
      ...blockHandleState,
      blockPos: undefined,
      cursorPos: undefined,
    })

    view.dispatch(tr)
  }

  const onPrettify = () => {
    const block = selectedBlock()
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
    const block = selectedBlock()
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
    const block = selectedBlock()
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
    const block = selectedBlock()
    if (!block) return

    const id = `mermaid-graph-${block.blockPos}`
    const svg = document.getElementById(id)
    if (svg) await remote.saveSvg(svg)
    closeTooltip()
  }

  const onMermaidHideCode = () => {
    const block = selectedBlock()
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
    const block = selectedBlock()
    if (!block) return

    const view = ctrl.file.currentFile?.editorView
    if (!view) return

    const toPlain = setBlockType(view.state.schema.nodes.paragraph)
    toPlain(view.state, view.dispatch)

    const tr = view.state.tr
    const pos = tr.doc.resolve(block.blockPos)
    if (!pos.nodeAfter) return
    tr.removeMark(pos.pos, pos.pos + pos.nodeAfter.nodeSize)
    view.dispatch(tr)
    view.focus()
    closeTooltip()
  }

  const onRemoveBlock = () => {
    const block = selectedBlock()
    if (!block) return

    const view = ctrl.file.currentFile?.editorView
    if (!view) return

    const tr = view.state.tr
    const pos = tr.doc.resolve(block.blockPos)
    const from = pos.before(1)
    const to = pos.after(1)
    tr.delete(from, to)
    view.dispatch(tr)
    view.focus()

    closeTooltip()
  }

  const onAlign = (align: Align) => () => {
    const block = selectedBlock()
    if (block?.cursorPos === undefined) return

    const view = ctrl.file.currentFile?.editorView
    if (!view) return

    const tr = view.state.tr
    tr.setNodeAttribute(block.cursorPos, 'align', align)

    view.dispatch(tr)
    closeTooltip()
  }

  const onOpenLink = async () => {
    const block = selectedBlock()
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
    const block = selectedBlock()
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
    const block = selectedBlock()
    if (!block) return

    const view = ctrl.file.currentFile?.editorView
    if (!view) return

    const blockHandleState = getBlockHandleState()
    if (blockHandleState?.blockPos === undefined) return

    if (tooltipRef.contains(e.target as Element)) return

    const tr = view.state.tr
    tr.setMeta(blockHandlePluginKey, {
      ...blockHandleState,
      blockPos: undefined,
      cursorPos: undefined,
    })

    view.dispatch(tr)
  }

  const getBlockHandleState = createMemo(() => {
    if (!store.lastTr) return
    const view = ctrl.file.currentFile?.editorView
    if (!view) return
    return blockHandlePluginKey.getState(view.state)
  })

  createEffect(() => {
    if (!store.lastTr) return
    const view = ctrl.file.currentFile?.editorView
    if (!view) return

    const blockHandleState = getBlockHandleState()

    if (blockHandleState?.blockPos !== undefined) {
      // Catch "position out of range" error after remove last node
      try {
        const pos = view.state.doc.resolve(blockHandleState.blockPos + 1)
        const cursorPos = blockHandleState.cursorPos
        let cursorNode

        if (cursorPos !== undefined) {
          const resolved = view.state.doc.resolve(cursorPos)
          cursorNode = resolved.nodeAfter ?? undefined
        }

        setSelectedBlock({
          blockPos: blockHandleState.blockPos,
          blockNode: pos.node(),
          cursorPos,
          cursorNode,
        })
      } catch (_e) {
        setSelectedBlock(undefined)
      }
    } else {
      setSelectedBlock(undefined)
    }
  })

  createEffect(() => {
    const result = selectedBlock()
    if (!result) return
    const {blockPos} = result

    const view = ctrl.file.currentFile?.editorView
    if (!view) return

    const sel = NodeSelection.near(view.state.doc.resolve(blockPos))
    const handle = view.dom.querySelector(`#block-${sel.head} .block-handle`)
    if (!handle) return

    unwrap(cleanup).fn?.()
    cleanup.fn = autoUpdate(handle, tooltipRef, async () => {
      return computePosition(handle, tooltipRef, {
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
      <Show when={selectedBlock()}>
        {(block) => (
          <>
            <TooltipEl ref={tooltipRef} class="block-tooltip">
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
