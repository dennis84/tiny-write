import {Plugin, NodeSelection, PluginKey, EditorState, TextSelection} from 'prosemirror-state'
import {DecorationSet, Decoration, EditorView} from 'prosemirror-view'

const handleIcon =
  '<svg viewBox="0 0 10 10" height="14" width="14"><path d="M3 2a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm4-8a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2z"/></svg>'

interface DragMemo {
  from: number;
  empty: boolean;
  isAtom: boolean;
  isText: boolean;
}

const createDragHandle = (editorView: EditorView, getPos: () => number | undefined) => {
  const handle = document.createElement('span')
  handle.id = `block-handle-${getPos()}`

  let firstSel: DragMemo = {
    empty: true,
    from: 0,
    isAtom: false,
    isText: false,
  }

  const onDown = () => {
    const pos = getPos()
    if (pos === undefined) return

    const nodeAfter = editorView.state.selection.$from.nodeAfter
    firstSel = {
      from: editorView.state.selection.from,
      empty: editorView.state.selection.empty,
      isAtom: nodeAfter?.isAtom ?? false,
      isText: nodeAfter?.isText ?? false
    }

    const resolved = editorView.state.doc.resolve(pos)
    const tr = editorView.state.tr
    tr.setSelection(NodeSelection.create(tr.doc, resolved.before(1)))
    editorView.dispatch(tr)
  }

  const onUp = () => {
    const pos = getPos()
    if (pos === undefined) return

    const resolved = editorView.state.doc.resolve(pos)
    const tr = editorView.state.tr
    let cursorPos

    const inBlock = firstSel.from >= pos && firstSel.from <= resolved.after(1)

    if (firstSel.empty && inBlock) {
      cursorPos = firstSel.from
      const range = markAround(editorView.state, firstSel.from)
      if (range) {
        tr.setSelection(TextSelection.create(editorView.state.doc, range.from, range.to))
      }
    } else if (inBlock && firstSel.isAtom && !firstSel.isText) {
      cursorPos = firstSel.from
      tr.setSelection(NodeSelection.create(editorView.state.doc, firstSel.from))
    }

    const state = blockHandlePluginKey.getState(editorView.state)
    const newState = {...state, blockPos: getPos(), cursorPos}
    tr.setMeta(blockHandlePluginKey, newState)
    editorView.dispatch(tr)
  }

  // Don't focus CM when selection is outside of code_block and keep
  // node selection from pointerdown.
  // Does not work if the selection is in the code_block. In this case,
  // a preventDefault on mousedown would help, but it would also disable
  // drag/drop.
  const onMouseUp = (e: MouseEvent) => {
    e.stopPropagation()
  }

  handle.addEventListener('pointerdown', onDown)
  handle.addEventListener('pointerup', onUp)
  handle.addEventListener('mouseup', onMouseUp)

  ;(handle as any).destroy = () => {
    handle.removeEventListener('pointerdown', onDown)
    handle.removeEventListener('pointerup', onUp)
    handle.removeEventListener('mouseup', onMouseUp)
  }

  handle.style.touchAction = 'none'
  handle.setAttribute('contenteditable', 'false')
  const icon = document.createElement('span')
  icon.innerHTML = handleIcon
  handle.appendChild(icon)
  handle.classList.add('block-handle')
  return handle
}

export const blockHandlePluginKey = new PluginKey('block-handle')

const blockHandle = new Plugin({
  key: blockHandlePluginKey,
  state: {
    init() {
      return {
        blockPos: undefined,
        cursorPos: undefined,
        decorations: DecorationSet.empty,
      }
    },
    apply(tr, prev) {
      const meta = tr.getMeta(blockHandlePluginKey)

      if (meta && meta?.blockPos !== prev.blockPos) prev.blockPos = meta.blockPos
      if (meta && meta?.cursorPos !== prev.cursorPos) prev.cursorPos = meta.cursorPos
      if (!tr.docChanged) return prev

      const decos: Decoration[] = []
      tr.doc.forEach((node, offset) => {
        decos.push(Decoration.node(offset, offset + node.nodeSize, {class: 'draggable'}))
        decos.push(Decoration.widget(offset + 1, createDragHandle, {
          destroy: (node: any) => {
            node.destroy?.()
          },
          // helps against the sync error if the handle button is clicked too quickly
          stopEvent: () => true
        }))
      })

      prev.decorations = DecorationSet.create(tr.doc, decos)
      return prev
    }
  },
  props: {
    decorations(state) {
      return blockHandlePluginKey.getState(state).decorations
    },
  }
})

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

export const plugins = () => [blockHandle]
