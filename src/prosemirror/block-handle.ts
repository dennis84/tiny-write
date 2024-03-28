import {Plugin, NodeSelection, PluginKey, EditorState, TextSelection} from 'prosemirror-state'
import {DecorationSet, Decoration} from 'prosemirror-view'
import {ProseMirrorExtension} from '@/prosemirror'

const handleIcon =
  '<svg viewBox="0 0 10 10" height="14" width="14"><path d="M3 2a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm4-8a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2z"/></svg>'

const createDragHandle = () => {
  const handle = document.createElement('span')
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
    handleDOMEvents: {
      mousedown: (editorView, event: MouseEvent) => {
        const target = event.target as Element
        if (target.classList.contains('block-handle')) {
          // stop bubbling, otherwise tooltip background click will be triggered
          event.stopPropagation()

          const handlePos = editorView.posAtCoords({left: event.x + 30, top: event.y})
          if (!handlePos) return false

          const state = editorView.state
          const sel = state.selection
          const handle = state.doc.resolve(handlePos.pos)
          const blockPos = handle.before(1)
          const tr = state.tr
          let cursorPos = undefined

          if (sel.empty && sel.from >= blockPos && sel.head <= handle.after(1)) {
            cursorPos = sel.from
            const range = markAround(state, cursorPos)
            if (range) {
              tr.setSelection(TextSelection.create(editorView.state.doc, range.from, range.to))
            } else {
              tr.setSelection(NodeSelection.create(editorView.state.doc, blockPos))
            }
          } else if (sel.empty) {
            tr.setSelection(NodeSelection.create(editorView.state.doc, blockPos))
          } else if (sel.$from.nodeAfter?.isAtom) {
            cursorPos = sel.from
          }

          tr.setMeta(blockHandlePluginKey, {blockPos, cursorPos})
          editorView.dispatch(tr)
          return false
        }
      },
      mouseup: (_editorView, event: MouseEvent) => {
        const target = event.target as Element
        if (target.classList.contains('block-handle')) {
          event.stopPropagation() // keep node selection
        }
      },
    }
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
