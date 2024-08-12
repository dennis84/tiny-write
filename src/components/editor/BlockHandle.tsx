import {createEffect, createSignal, onCleanup} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Node} from 'prosemirror-model'
import {EditorState, NodeSelection, TextSelection} from 'prosemirror-state'
// @ts-ignore
import {__serializeForClipboard} from 'prosemirror-view'
import {File} from '@/state'
import {ZIndex} from '@/utils/z-index'
import {Icon} from '../Icon'
import {BlockTooltip} from './BlockTooltip'

const DragHandle = styled('div')`
  position: absolute;
  opacity: 0;
  transition: opacity 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: var(--cursor-pointer);
  z-index: ${ZIndex.MAX};
  > span {
    color: var(--foreground-60);
    border-radius: var(--border-radius);
    padding: 4px;
  }
  &:hover > span {
    color: var(--foreground-80);
    background: var(--foreground-10);
  }
  @media print {
    display: none;
  }
`

const WIDTH = 30

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
  const [cursorPos, setCursorPos] = createSignal<number | undefined>()

  const getBlockPos = ([x, y]: [number, number]): number | undefined => {
    const editorView = props.file?.editorView
    if (!editorView) return

    const coords = {left: x + WIDTH, top: y}
    const pos = editorView.posAtCoords(coords)
    if (!pos) return

    const resolved = editorView.state.doc.resolve(pos.pos)
    return resolved.before(1)
  }

  const onResetBlock = () => {
    setSelectedBlock(undefined)
  }

  const onDragHandleDown = () => {
    const editorView = props.file?.editorView
    if (!editorView) return
    setCursorPos(editorView.state.selection.from)
  }

  const onDragHandleClick = (e: MouseEvent) => {
    const editorView = props.file?.editorView
    if (!editorView) return

    const blockPos = getBlockPos([e.clientX, e.clientY]) ?? 0
    const blockInnerPos = editorView.state.doc.resolve(blockPos + 1)
    const blockNode = blockInnerPos.node()

    let cursorNode
    const cp = cursorPos()
    if (cp !== undefined) {
      const resolved = editorView.state.doc.resolve(cp)
      cursorNode = resolved.nodeAfter ?? undefined

      const tr = editorView.state.tr
      const range = markAround(editorView.state, cp)
      const inBlock = cp >= blockPos && cp <= blockInnerPos.after(1)

      if (editorView.state.selection.empty && range && inBlock) {
        tr.setSelection(TextSelection.create(editorView.state.doc, range.from, range.to))
      } else if (inBlock && cursorNode?.isAtom && !cursorNode.isText) {
        tr.setSelection(NodeSelection.create(editorView.state.doc, cp))
      } else {
        tr.setSelection(NodeSelection.create(editorView.state.doc, blockPos))
      }

      editorView.dispatch(tr)
      editorView.focus()
    }

    setSelectedBlock({
      blockPos,
      blockNode,
      cursorPos: cp,
      cursorNode,
      dragHandle,
    })
  }

  const hideDragHandle = () => {
    if (selectedBlock()) return
    dragHandle.style.opacity = '0'
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

    const cstyle = window.getComputedStyle(node)
    const lineHeight = parseInt(cstyle.lineHeight, 10)

    const x = node.offsetLeft + editorView.dom.offsetLeft
    const y = node.offsetTop + editorView.dom.offsetTop
    const top = y - 2 + (lineHeight - 24) / 2

    dragHandle.style.opacity = '1'
    dragHandle.style.top = `${top}px`
    dragHandle.style.left = `${x - WIDTH}px`
  }

  const onDragStart = (e: DragEvent) => {
    if (!e.dataTransfer) return

    const editorView = props.file?.editorView
    if (!editorView) return

    const blockPos = getBlockPos([e.clientX, e.clientY])
    if (!blockPos) return

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
    dom.addEventListener('mouseout', hideDragHandle)

    onCleanup(() => {
      dom.removeEventListener('mousemove', onMouseMove)
      dom.removeEventListener('mouseout', hideDragHandle)
    })
  })

  return (
    <>
      <DragHandle
        ref={dragHandle}
        id="block-handle"
        onClick={onDragHandleClick}
        onMouseDown={onDragHandleDown}
        onDragStart={onDragStart}
        draggable={true}
      >
        <Icon>drag_indicator</Icon>
      </DragHandle>
      <BlockTooltip selectedBlock={selectedBlock()} resetBlock={onResetBlock} />
    </>
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
