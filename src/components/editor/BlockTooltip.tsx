import {Show, createEffect, createSignal, onCleanup} from 'solid-js'
import {createMutable} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import {NodeSelection} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {Node} from 'prosemirror-model'
import {setBlockType} from 'prosemirror-commands'
import {arrow, autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom'
import {CanvasEditorElement, Mode, isEditorElement, useState} from '@/state'
import * as remote from '@/remote'

const TooltipEl = styled('div')`
  position: absolute;
  z-index: 100;
`

interface Block {
  pos: number;
  node: Node;
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
    const dom = view?.domAtPos(block.pos + 1)
    dom?.node.dispatchEvent(new CustomEvent('cm:user_event', {
      detail: {userEvent: 'prettify'},
    }))

    view?.focus()
  }

  const onFoldAll = () => {
    const block = selectedBlock()
    if (!block) return
    const view = getEditorView()
    const dom = view?.domAtPos(block.pos + 1)
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

    if (block.node.attrs.lang === 'mermaid') {
      const tr = view.state.tr
      tr.setNodeAttribute(block.pos, 'hidden', false)
      view.dispatch(tr)
    }

    deselect()

    const dom = view.domAtPos(block.pos + 1)
    dom.node.dispatchEvent(new CustomEvent('cm:user_event', {
      detail: {userEvent: 'change-lang'},
    }))
  }

  const onMermaidSave = () => {
    const block = selectedBlock()
    if (!block) return

    const id = `mermaid-graph-${block.pos}`
    const svg = document.getElementById(id)
    if (svg) remote.saveSvg(svg)
  }

  const onMermaidHideCode = () => {
    const block = selectedBlock()
    if (!block) return

    const view = getEditorView()
    if (!view) return

    const tr = view.state.tr
    tr.setNodeAttribute(block.pos, 'hidden', !block.node.attrs.hidden)
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
    const pos = tr.doc.resolve(block.pos)
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
    const pos = tr.doc.resolve(block.pos)
    if (!pos.nodeAfter) return
    tr.delete(pos.pos, pos.pos + pos.nodeAfter.nodeSize)
    view.dispatch(tr)
    view.focus()
  }

  createEffect(() => {
    store.lastTr
    const view = getEditorView()
    const sel = view?.state.selection
    if (!view || !sel || sel.empty) {
      setSelectedBlock(undefined)
      return
    }

    const blockPos = sel.$from.before(1)
    const ns = NodeSelection.create(view.state.doc, blockPos)

    if (sel.eq(ns)) {
      setSelectedBlock({pos: blockPos, node: ns.node})
    } else {
      setSelectedBlock(undefined)
    }
  })

  createEffect(() => {
    const result = selectedBlock()
    if (!result) return
    const {pos} = result

    const view = getEditorView()
    const el = view?.domAtPos(pos + 1).node as HTMLElement
    const handle = el?.querySelector('.block-handle')
    if (!handle) return

    cleanup.fn = autoUpdate(handle, tooltipRef, () => {
      computePosition(handle, tooltipRef, {
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

  onCleanup(() => {
    cleanup.fn?.()
  })

  return (
    <Show when={selectedBlock()}>
      {(block) => <>
        <TooltipEl ref={tooltipRef} class="block-tooltip">
          <Show when={block().node?.type.name === 'code_block'}>
            <div onClick={onChangeLang} data-testid="change_lang">💱 change language</div>
            <div onClick={onPrettify} data-testid="prettify">💅 prettify</div>
            <div onClick={onFoldAll}>🙏 fold all</div>
            <Show when={block().node.attrs.lang === 'mermaid'}>
              <div onClick={onMermaidSave}>💾 save as png</div>
              <div onClick={onMermaidHideCode}>
                {block().node.attrs.hidden ? '🙉 Show code' : '🙈 Hide code'}
              </div>
            </Show>
            <hr class="divider" />
          </Show>
          <div onClick={onToPlain}>🧽 remove text formats</div>
          <div onClick={onRemoveBlock} data-testid="remove_block">🗑️ remove block</div>
          <span ref={arrowRef} class="arrow"></span>
        </TooltipEl>
      </>}
    </Show>
  )
}
