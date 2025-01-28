import {createEffect, createSignal, onCleanup, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {styled} from 'solid-styled-components'
import {Node} from 'prosemirror-model'
import {EditorState, NodeSelection, TextSelection} from 'prosemirror-state'
// @ts-ignore
import {__serializeForClipboard} from 'prosemirror-view'
import {File, useState} from '@/state'
import {IconDragIndicator} from '../Icon'
import {BlockTooltip} from './BlockTooltip'

const DragHandle = styled('div')`
  position: absolute;
  opacity: 0;
  transition: opacity 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: var(--cursor-pointer);
  z-index: var(--z-index-handle);
  > span {
    color: var(--foreground-60);
    border-radius: 20px;
    padding: 10px;
    margin-top: -6px;
  }
  &:hover > span {
    color: var(--foreground-80);
    background: var(--foreground-10);
  }
  @media print {
    display: none;
  }
`

const WIDTH = 40

export interface Block {
  dragHandle: Element
  blockPos: number
  blockNode: Node
  cursorPos?: number
  cursorNode?: Node
}

interface Props {
  file?: File
  mouseMoveArea?: () => HTMLElement
}

export const BlockHandle = (props: Props) => {
  let dragHandle!: HTMLDivElement

  const [selectedBlock, setSelectedBlock] = createSignal<Block | undefined>()
  const [blockDom, setBlockDom] = createSignal<HTMLElement>()
  const {appService} = useState()

  const getBlockPos = ([x, y]: [number, number]): number | undefined => {
    const editorView = props.file?.editorView
    if (!editorView) return

    const coords = {left: x + WIDTH, top: y}
    const pos = editorView.posAtCoords(coords)
    if (!pos) return

    const plus = pos.pos === pos.inside ? 1 : 0
    const resolved = editorView.state.doc.resolve(pos.pos + plus)
    if (resolved.node().type.name === 'doc') return
    return resolved.before(1)
  }

  const onResetBlock = () => {
    setSelectedBlock(undefined)
    setBlockDom(undefined)
  }

  const onMouseDown = (e: MouseEvent) => {
    const editorView = props.file?.editorView
    if (!editorView) return

    const cursorPos = editorView.state.selection.from
    const blockPos = getBlockPos([e.clientX, e.clientY]) ?? 0
    const blockInnerPos = editorView.state.doc.resolve(blockPos + 1)
    const blockNode = blockInnerPos.node()
    const blockDom = editorView.domAtPos(blockInnerPos.pos).node as HTMLElement
    setBlockDom(blockDom)

    let cursorNode
    if (cursorPos !== undefined) {
      const resolved = editorView.state.doc.resolve(cursorPos)
      cursorNode = resolved.nodeAfter ?? undefined

      const tr = editorView.state.tr
      const range = markAround(editorView.state, cursorPos)
      const inBlock = cursorPos >= blockPos && cursorPos <= blockInnerPos.after(1)

      if (editorView.state.selection.empty && range && inBlock) {
        tr.setSelection(TextSelection.create(editorView.state.doc, range.from, range.to))
      } else if (inBlock && cursorNode?.isAtom && !cursorNode.isText) {
        tr.setSelection(NodeSelection.create(editorView.state.doc, cursorPos))
      } else {
        tr.setSelection(NodeSelection.create(editorView.state.doc, blockPos))
      }

      editorView.dispatch(tr)
      editorView.focus()
    }

    setSelectedBlock({
      blockPos,
      blockNode,
      cursorPos,
      cursorNode,
      dragHandle,
    })
  }

  const hideDragHandle = () => {
    if (selectedBlock()) return
    if (dragHandle) dragHandle.style.opacity = '0'
    setBlockDom(undefined)
  }

  const calcPos = (node: HTMLElement) => {
    const editorView = props.file?.editorView
    if (!editorView) {
      return
    }

    const cstyle = window.getComputedStyle(node)
    const lineHeight = parseInt(cstyle.lineHeight, 10)

    const x = node.offsetLeft + editorView.dom.offsetLeft
    const y = node.offsetTop + editorView.dom.offsetTop
    const top = y - 2 + (lineHeight - 24) / 2

    dragHandle.style.opacity = '1'
    dragHandle.style.top = `${top}px`
    dragHandle.style.left = `${x - WIDTH}px`
  }

  const onMouseMove = (e: MouseEvent) => {
    if (selectedBlock()) {
      return
    }

    if (e.target === dragHandle) {
      return
    }

    const editorView = props.file?.editorView
    if (!editorView) {
      return
    }

    const blockPos = getBlockPos([e.clientX, e.clientY])
    if (blockPos === undefined) {
      return hideDragHandle()
    }

    const dom = editorView.domAtPos(blockPos + 1)
    const node = dom?.node as HTMLElement
    if (!node || node === editorView.dom) {
      return hideDragHandle()
    }

    setBlockDom(node)
    calcPos(node)
  }

  const onWheel = () => {
    const b = blockDom()
    if (!b) return
    calcPos(b)
  }

  const onDragStart = (e: DragEvent) => {
    if (!e.dataTransfer) return

    const editorView = props.file?.editorView
    if (!editorView) return

    const blockPos = getBlockPos([e.clientX, e.clientY])
    if (blockPos === undefined) return

    const tr = editorView.state.tr
    tr.setSelection(NodeSelection.create(editorView.state.doc, blockPos))
    editorView.dispatch(tr)

    const slice = editorView.state.selection.content()
    const {text, dom} = __serializeForClipboard(editorView, slice)

    e.dataTransfer.clearData()
    e.dataTransfer.setData('text/html', dom.innerHTML)
    e.dataTransfer.setData('text/plain', text)
    e.dataTransfer.effectAllowed = 'copyMove'

    const el = document.querySelector('.ProseMirror-selectednode')
    e.dataTransfer?.setDragImage(el!, 0, 0)

    editorView.dragging = {slice, move: true}
  }

  createEffect(() => {
    const editorView = props.file?.editorView
    if (!editorView) return

    const dom = props.mouseMoveArea?.() ?? editorView.dom

    dom.addEventListener('mousemove', onMouseMove)
    dom.addEventListener('mouseleave', hideDragHandle)
    window.addEventListener('wheel', onWheel)

    onCleanup(() => {
      dom.removeEventListener('mousemove', onMouseMove)
      dom.removeEventListener('mouseleave', hideDragHandle)
      window.removeEventListener('wheel', onWheel)
    })
  })

  return (
    <Show when={blockDom()}>
      <DragHandle
        ref={dragHandle}
        id="block-handle"
        onMouseDown={onMouseDown}
        onDragStart={onDragStart}
        onDragEnd={onResetBlock}
        draggable={true}
      >
        <IconDragIndicator />
      </DragHandle>
      <Portal mount={appService.layoutRef}>
        <BlockTooltip selectedBlock={selectedBlock()} resetBlock={onResetBlock} />
      </Portal>
    </Show>
  )
}

const markAround = (state: EditorState, pos: number) => {
  const resolved = state.doc.resolve(pos)

  const {parent, parentOffset} = resolved
  const start = parent.childAfter(parentOffset)
  if (!start.node) return

  const mark = start.node.marks[0]
  if (!mark) return

  let startIndex = resolved.index()
  let startPos = resolved.start() + start.offset
  let endIndex = startIndex + 1
  let endPos = startPos + start.node.nodeSize
  while (startIndex > 0 && mark.isInSet(parent.child(startIndex - 1).marks)) {
    startIndex -= 1
    startPos -= parent.child(startIndex).nodeSize
  }
  while (endIndex < parent.childCount && mark.isInSet(parent.child(endIndex).marks)) {
    endPos += parent.child(endIndex).nodeSize
    endIndex += 1
  }

  return {from: startPos, to: endPos}
}
