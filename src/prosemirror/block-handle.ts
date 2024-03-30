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

  new DragGesture(handle, ({event, first, last, movement: [, my], memo}) => {
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
    if (last && my === 0) {
      event.preventDefault()
      event.stopPropagation()
      const tr = editorView.state.tr
      let cursorPos = undefined

      if (firstSel.empty && firstSel.from >= pos && firstSel.from <= resolved.after(1)) {
        const range = markAround(editorView.state, firstSel.from)
        if (range) {
          tr.setSelection(TextSelection.create(editorView.state.doc, range.from, range.to))
        }
      } else if (firstSel.isAtom) {
        cursorPos = firstSel.from
        tr.setSelection(NodeSelection.create(editorView.state.doc, firstSel.from))
      } else {
        cursorPos = undefined
      }

      tr.setMeta(blockHandlePluginKey, {blockPos: getPos(), cursorPos})
      editorView.dispatch(tr)
      return firstSel
    }
  }, {
    eventOptions:{passive: false},
  })

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
      }
    },
    apply(tr, prev) {
      const meta = tr.getMeta(blockHandlePluginKey)
      if (!meta) return prev
      return meta
    }
  },
  props: {
    decorations(state) {
      const decos: Decoration[] = []
      state.doc.forEach((node, pos) => {
        decos.push(Decoration.widget(pos + 1, createDragHandle))
        decos.push(Decoration.node(pos, pos + node.nodeSize, {class: 'draggable'}))
      })

      return DecorationSet.create(state.doc, decos)
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
