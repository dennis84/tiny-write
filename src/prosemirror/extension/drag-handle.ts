import {Plugin, NodeSelection, PluginKey} from 'prosemirror-state'
import {DecorationSet, Decoration, EditorView} from 'prosemirror-view'
import {setBlockType} from 'prosemirror-commands'
import {ProseMirrorExtension} from '@/prosemirror/state'
import {arrow, autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom'

const handleIcon =
  '<svg viewBox="0 0 10 10" height="14" width="14"><path d="M3 2a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm4-8a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2z"/></svg>'

const createDragHandle = () => {
  const handle = document.createElement('div')
  handle.setAttribute('contenteditable', 'false')
  const icon = document.createElement('span')
  icon.innerHTML = handleIcon
  handle.appendChild(icon)
  handle.classList.add('handle')
  return handle
}

class TooltipView {
  private tooltip: HTMLElement
  private arrow: HTMLElement
  private cleanup: any
  private pos: number

  private onClose = (e) => {
    if (!e.target.closest('.block-tooltip')) {
      const tr = this.view.state.tr
      tr.setMeta(pluginKey, {showMenu: false, ref: undefined, pos: undefined})
      this.view.dispatch(tr)
    }
  }

  private onToPlain = () => {
    const toPlain = setBlockType(this.view.state.schema.nodes.paragraph)
    toPlain(this.view.state, this.view.dispatch)
    const tr = this.view.state.tr
    const pos = tr.doc.resolve(this.pos)
    tr.removeMark(pos.pos, pos.pos + pos.nodeAfter.nodeSize)
    tr.setMeta(pluginKey, {showMenu: false, ref: undefined, pos: undefined})
    this.view.dispatch(tr)
    this.view.focus()
  }

  private onRemoveBlock = () => {
    const tr = this.view.state.tr
    const pos = tr.doc.resolve(this.pos)
    tr.delete(pos.pos, pos.pos + pos.nodeAfter.nodeSize)
    tr.setMeta(pluginKey, {showMenu: false, ref: undefined, pos: undefined})
    this.view.dispatch(tr)
    this.view.focus()
  }

  constructor(private view) {
    this.tooltip = document.createElement('div')
    this.tooltip.className = 'block-tooltip'

    const toPlain = document.createElement('div')
    toPlain.textContent = '🧽 remove text formats'
    toPlain.addEventListener('click', this.onToPlain)
    this.tooltip.appendChild(toPlain)

    const removeBlock = document.createElement('div')
    removeBlock.textContent = '🗑️ remove block'
    removeBlock.addEventListener('click', this.onRemoveBlock)
    this.tooltip.appendChild(removeBlock)

    this.arrow = document.createElement('span')
    this.arrow.className = 'arrow'
    this.tooltip.appendChild(this.arrow)

    view.dom.parentNode.appendChild(this.tooltip)
    this.update(view)
  }

  update(view: EditorView) {
    const {showMenu, ref, pos} = pluginKey.getState(view.state)

    if (!showMenu) {
      if (this.cleanup) {
        this.cleanup()
        this.cleanup = undefined
      }

      document.removeEventListener('mousedown', this.onClose)
      this.tooltip.style.display = 'none'
      return
    }

    if (showMenu && this.cleanup) {
      return
    }

    this.pos = pos
    document.addEventListener('mousedown', this.onClose)
    this.tooltip.style.display = 'block'

    this.cleanup = autoUpdate(ref, this.tooltip, () => {
      computePosition(ref, this.tooltip, {
        placement: 'left',
        middleware: [
          offset(10),
          flip(),
          shift(),
          arrow({element: this.arrow}),
        ],
      }).then(({x, y, placement, middlewareData}) => {
        this.tooltip.classList.remove('left', 'right')
        this.tooltip.classList.add(placement)
        this.tooltip.style.left = `${x}px`
        this.tooltip.style.top = `${y}px`
        this.arrow.style.left = middlewareData.arrow.x !== null ? `${middlewareData.arrow.x}px` : ''
        this.arrow.style.top = middlewareData.arrow.y !== null ? `${middlewareData.arrow.y}px` : ''
      })
    })
  }
}

export const pluginKey = new PluginKey('drag-handle')

const handlePlugin = new Plugin({
  key: pluginKey,
  state: {
    init() {
      return {
        showMenu: false,
        ref: undefined,
        pos: undefined,
      }
    },
    apply(tr, prev) {
      const action = tr.getMeta(this)
      return action ?? prev
    },
  },
  view(editorView) {
    return new TooltipView(editorView)
  },
  props: {
    decorations(state) {
      const decos = []
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
        if (target.classList.contains('handle')) {
          const pos = editorView.posAtCoords({left: event.x + 30, top: event.y})
          const resolved = editorView.state.doc.resolve(pos.pos)
          const blockPos = resolved.before(1)
          const tr = editorView.state.tr
          tr.setSelection(NodeSelection.create(editorView.state.doc, blockPos))
          tr.setMeta(pluginKey, {x: event.x, y: event.y, pos: blockPos})
          editorView.dispatch(tr)
          return false
        }
      },
      mouseup: (editorView, event: MouseEvent) => {
        const {x, y, pos} = pluginKey.getState(editorView.state)
        if (event.x === x && event.y === y) {
          event.stopPropagation() // keep node selection
          const tr = editorView.state.tr
          tr.setMeta(pluginKey, {showMenu: true, ref: event.target, pos})
          editorView.dispatch(tr)
        }
      }
    }
  }
})

export default (): ProseMirrorExtension => ({
  plugins: (prev) => [...prev, handlePlugin]
})
