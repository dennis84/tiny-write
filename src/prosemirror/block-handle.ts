import {Plugin, NodeSelection, PluginKey} from 'prosemirror-state'
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
        cursorPos: undefined
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
        decos.push(Decoration.node(pos, pos + node.nodeSize, {
          class: 'draggable',
        }))
      })

      return DecorationSet.create(state.doc, decos)
    },
    handleDOMEvents: {
      mousedown: (editorView, event: MouseEvent) => {
        const target = event.target as Element
        if (target.classList.contains('block-handle')) {
          const pos = editorView.posAtCoords({left: event.x + 30, top: event.y})
          if (!pos) return false
          const state = editorView.state
          const resolved = state.doc.resolve(pos.pos)
          const blockPos = resolved.before(1)
          const tr = state.tr
          let cursorPos = undefined
          if (
            state.selection.empty &&
            state.selection.head >= blockPos &&
            state.selection.head <= resolved.after(1)
          ) {
            cursorPos = state.selection.head
          }

          tr.setMeta(blockHandlePluginKey, {blockPos, cursorPos})
          tr.setSelection(NodeSelection.create(editorView.state.doc, blockPos))
          editorView.focus() // unfocus CM and focus PM
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

export default (): ProseMirrorExtension => ({
  plugins: (prev) => [...prev, blockHandle]
})
