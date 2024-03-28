import {Show, createEffect, createMemo, createSignal, onCleanup, onMount} from 'solid-js'
import {createMutable, unwrap} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import {EditorView} from 'prosemirror-view'
import {Node} from 'prosemirror-model'
import {setBlockType} from 'prosemirror-commands'
import {arrow, autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom'
import {CanvasEditorElement, Mode, isEditorElement, useState} from '@/state'
import * as remote from '@/remote'
import {Align} from '@/prosemirror/image'
import {blockHandlePluginKey} from '@/prosemirror/block-handle'

const TooltipEl = styled('div')`
  position: absolute;
  z-index: 100;
`

interface Block {
  blockPos: number;
  blockNode: Node;
  cursorPos?: number;
  cursorNode?: Node;
  marks: string[];
}

interface Cleanup {
  fn?: () => void;
}

export const BlockTooltip = () => {
  let tooltipRef!: HTMLDivElement
  let arrowRef!: HTMLSpanElement

  const [store, ctrl] = useState()
  const [selectedBlock, setSelectedBlock] = createSignal<Block | undefined>()
  const cleanup = createMutable<Cleanup>({})

  const deselect = () => {
    if (store.mode === Mode.Canvas) {
      ctrl.canvas.deselect()
    } else {
      ctrl.editor.deselect()
    }
  }

  const getEditorView = (): EditorView | undefined => {
    if (store.mode === Mode.Canvas) {
      const currentCanvas = ctrl.canvas.currentCanvas
      const element = currentCanvas?.elements?.find((el) => isEditorElement(el) && el.active) as CanvasEditorElement
      return element?.editorView || undefined
    } else {
      return ctrl.file.currentFile?.editorView
    }
  }

  const onPrettify = () => {
    const block = selectedBlock()
    if (!block) return
    const view = getEditorView()
    const dom = view?.domAtPos(block.blockPos + 1)
    dom?.node.dispatchEvent(new CustomEvent('cm:user_event', {
      detail: {userEvent: 'prettify'},
    }))

    view?.focus()
  }

  const onFoldAll = () => {
    const block = selectedBlock()
    if (!block) return
    const view = getEditorView()
    const dom = view?.domAtPos(block.blockPos + 1)
    dom?.node.dispatchEvent(new CustomEvent('cm:user_event', {
      detail: {userEvent: 'fold_all'},
    }))

    view?.focus()
  }

  const onChangeLang = () => {
    const block = selectedBlock()
    if (!block) return

    const view = getEditorView()
    if (!view) return

    if (block.blockNode.attrs.lang === 'mermaid') {
      const tr = view.state.tr
      tr.setNodeAttribute(block.blockPos, 'hidden', false)
      view.dispatch(tr)
    }

    deselect()

    const dom = view.domAtPos(block.blockPos + 1)
    dom.node.dispatchEvent(new CustomEvent('cm:user_event', {
      detail: {userEvent: 'change-lang'},
    }))
  }

  const onMermaidSave = async () => {
    const block = selectedBlock()
    if (!block) return

    const id = `mermaid-graph-${block.blockPos}`
    const svg = document.getElementById(id)
    if (svg) await remote.saveSvg(svg)
  }

  const onMermaidHideCode = () => {
    const block = selectedBlock()
    if (!block) return

    const view = getEditorView()
    if (!view) return

    const tr = view.state.tr
    tr.setNodeAttribute(block.blockPos, 'hidden', !block.blockNode.attrs.hidden)
    view.dispatch(tr)
    view.focus()
  }

  const onToPlain = () => {
    const block = selectedBlock()
    if (!block) return

    const view = getEditorView()
    if (!view) return

    const toPlain = setBlockType(view.state.schema.nodes.paragraph)
    toPlain(view.state, view.dispatch)

    const tr = view.state.tr
    const pos = tr.doc.resolve(block.blockPos)
    if (!pos.nodeAfter) return
    tr.removeMark(pos.pos, pos.pos + pos.nodeAfter.nodeSize)
    view.dispatch(tr)
    view.focus()
  }

  const onRemoveBlock = () => {
    const block = selectedBlock()
    if (!block) return

    const view = getEditorView()
    if (!view) return

    const tr = view.state.tr
    const pos = tr.doc.resolve(block.blockPos)
    if (!pos.nodeAfter) return
    tr.delete(pos.pos, pos.pos + pos.nodeAfter.nodeSize)
    view.dispatch(tr)
    view.focus()
  }

  const onAlign = (align: Align) => () => {
    const block = selectedBlock()
    if (block?.cursorPos === undefined) return

    const view = getEditorView()
    if (!view) return

    const tr = view.state.tr
    tr.setNodeAttribute(block.cursorPos, 'align', align)

    view.dispatch(tr)
  }

  const onOpenLink = async () => {
    const block = selectedBlock()
    if (block?.cursorPos === undefined) return
    const view = getEditorView()
    if (!view) return

    const resolved = view.state.doc.resolve(block.cursorPos)
    const href = resolved.marks()[0]?.attrs?.href
    if (href) await remote.open(href)
  }

  const hasLink = (): boolean => {
    const block = selectedBlock()
    if (!block) return false

    return block.marks.find((m) => m === 'link' || m === 'edit_link') !== undefined
  }

  const onBackgroundClick = (e: MouseEvent) => {
    const block = selectedBlock()
    if (!block) return

    const view = getEditorView()
    if (!view) return

    const blockHandleState = getBlockHandleState()
    if (blockHandleState.blockPos === undefined) return

    if (tooltipRef.contains(e.target as Element)) return

    const tr = view.state.tr
    tr.setMeta(blockHandlePluginKey, {})
    view.dispatch(tr)
  }

  const getBlockHandleState = createMemo(() => {
    store.lastTr
    const view = getEditorView()
    if (!view) return
    return blockHandlePluginKey.getState(view.state)
  })

  createEffect(() => {
    const view = getEditorView()
    if (!view) return

    const blockHandleState = getBlockHandleState()

    if (blockHandleState.blockPos !== undefined) {
      const pos = view.state.doc.resolve(blockHandleState.blockPos + 1)
      const cursorPos = blockHandleState.cursorPos
      const marks: string[] = []
      let cursorNode

      if (cursorPos !== undefined) {
        const resolved = view.state.doc.resolve(cursorPos)
        resolved.marks().forEach((m) => marks.push(m.type.name))
        cursorNode = resolved.nodeAfter ?? undefined
      }

      setSelectedBlock({
        blockPos: blockHandleState.blockPos,
        blockNode: pos.node(),
        cursorPos,
        cursorNode,
        marks,
      })
    } else {
      setSelectedBlock(undefined)
    }
  })

  createEffect(() => {
    const result = selectedBlock()
    if (!result) return
    const {blockPos} = result

    const view = getEditorView()
    if (!view) return

    const el = view.domAtPos(blockPos + 1).node as HTMLElement
    const handle = el?.querySelector('.block-handle')
    if (!handle) return

    unwrap(cleanup).fn?.()
    cleanup.fn = autoUpdate(handle, tooltipRef, async () => {
      return computePosition(handle, tooltipRef, {
        placement: 'left',
        middleware: [
          offset(10),
          flip(),
          shift(),
          arrow({element: arrowRef}),
        ],
      }).then(({x, y, placement, middlewareData}) => {
        tooltipRef.style.left = `${x}px`
        tooltipRef.style.top = `${y}px`
        const side = placement.split('-')[0]
        const staticSide = {
          top: 'bottom',
          right: 'left',
          bottom: 'top',
          left: 'right'
        }[side] ?? 'top'

        if (middlewareData.arrow) {
          const {x, y} = middlewareData.arrow
          arrowRef.classList.add(staticSide)
          Object.assign(arrowRef.style, {
            left: x != null ? `${x}px` : '',
            top: y != null ? `${y}px` : '',
            [staticSide]: `${-arrowRef.offsetWidth / 2}px`
          });
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
    <Show when={selectedBlock()}>
      {(block) => <>
        <TooltipEl ref={tooltipRef} class="block-tooltip">
          <Show when={block().blockNode?.type.name === 'code_block'}>
            <div onClick={onChangeLang} data-testid="change_lang">💱 change language</div>
            <div onClick={onPrettify} data-testid="prettify">💅 prettify</div>
            <div onClick={onFoldAll}>🙏 fold all</div>
            <Show when={block().blockNode.attrs.lang === 'mermaid'}>
              <div onClick={onMermaidSave}>💾 save as png</div>
              <div onClick={onMermaidHideCode}>
                {block().blockNode.attrs.hidden ? '🙉 Show code' : '🙈 Hide code'}
              </div>
            </Show>
            <hr class="divider" />
          </Show>
          <Show when={block().cursorNode?.type.name === 'image' || block().cursorNode?.type.name === 'video'}>
            <div onClick={onAlign(Align.FloatLeft)} data-testid="align_float_left">👈 Float left</div>
            <div onClick={onAlign(Align.FloatRight)} data-testid="align_float_right">👉 Float right</div>
            <div onClick={onAlign(Align.Center)} data-testid="align_center">🖖 Center</div>
            <hr class="divider" />
          </Show>
          <Show when={hasLink()}>
            <div onClick={onOpenLink} data-testid="open_link">↗️ Open Link</div>
          </Show>
          <div onClick={onToPlain}>🧽 remove text formats</div>
          <div onClick={onRemoveBlock} data-testid="remove_block">🗑️ remove block</div>
          <span ref={arrowRef} class="arrow"></span>
        </TooltipEl>
      </>}
    </Show>
  )
}
