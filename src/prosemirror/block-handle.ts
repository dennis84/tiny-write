import {Plugin, NodeSelection, PluginKey, EditorState, TextSelection} from 'prosemirror-state'
import {DecorationSet, Decoration, EditorView} from 'prosemirror-view'
import {DragGesture} from '@use-gesture/vanilla'
import {ProseMirrorExtension} from '@/prosemirror'

const handleIcon =
  '<svg viewBox="0 0 10 10" height="14" width="14"><path d="M3 2a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm4-8a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2z"/></svg>'

const createDragHandle = (editorView: EditorView, getPos: () => number | undefined) => {
  const handle = document.createElement('span')

  // otherwise selection is lost
  handle.addEventListener('mouseup', (e) => e.stopPropagation())
  handle.style.touchAction = 'none'

  const gesture = new DragGesture(handle, ({event, first, last, movement: [, my], memo}) => {
    const pos = getPos()
    if (pos === undefined) return
    const resolved = editorView.state.doc.resolve(pos)
    const firstSel = memo ?? {
      from: editorView.state.selection.from,
      empty: editorView.state.selection.empty,
      isAtom: editorView.state.selection.$from.nodeAfter?.isAtom,
    }

    // select block to allow native dragging
    if (first) {
      event.stopPropagation()
      const tr = editorView.state.tr
      tr.setSelection(NodeSelection.create(editorView.state.doc, resolved.before(1)))
      editorView.dispatch(tr)
      return firstSel
    }

    // open menu if no movement
    if (last && my < 1) {
      event.preventDefault()
      const tr = editorView.state.tr
      let cursorPos = firstSel.from

      if (firstSel.empty && firstSel.from >= pos && firstSel.from <= resolved.after(1)) {
        const range = markAround(editorView.state, firstSel.from)
        if (range) {
          tr.setSelection(TextSelection.create(editorView.state.doc, range.from, range.to))
        }
      } else if (firstSel.isAtom) {
        tr.setSelection(NodeSelection.create(editorView.state.doc, firstSel.from))
      } else {
        cursorPos = undefined
      }

      const state = blockHandlePluginKey.getState(editorView.state)
      const newState = {...state, blockPos: getPos(), cursorPos}
      tr.setMeta(blockHandlePluginKey, newState)
      editorView.dispatch(tr)
      return firstSel
    }
  }, {
    eventOptions: {passive: false},
    delay: 0
  })

  ;(handle as any).gesture = gesture

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
            node.gesture?.destroy?.()
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

export default (): ProseMirrorExtension => ({
  plugins: (prev) => [...prev, blockHandle]
})
