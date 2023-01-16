import {Plugin, NodeSelection, PluginKey, Selection} from 'prosemirror-state'
import {DecorationSet, Decoration, EditorView} from 'prosemirror-view'
import {setBlockType} from 'prosemirror-commands'
import {ProseMirrorExtension} from '@/prosemirror'
import {arrow, autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom'

const handleIcon =
  '<svg viewBox="0 0 10 10" height="14" width="14"><path d="M3 2a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm4-8a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2zm0 4a1 1 0 110-2 1 1 0 010 2z"/></svg>'

const createDragHandle = () => {
  const handle = document.createElement('div')
  handle.setAttribute('contenteditable', 'false')
  const icon = document.createElement('span')
  icon.innerHTML = handleIcon
  handle.appendChild(icon)
  handle.classList.add('block-handle')
  return handle
}

class TooltipView {
  private tooltip: HTMLElement
  private arrow: HTMLElement
  private cleanup: any
  private pos: number

  private onClose = (e: MouseEvent) => {
    if (!(e.target as Element).closest('.block-tooltip')) {
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

  onPrettify = () => {
    const dom = this.view.domAtPos(this.pos + 1)
    ;(dom.node as any)?.CodeMirror?.prettify()
    const tr = this.view.state.tr
    tr.setMeta(pluginKey, {showMenu: false, ref: undefined, pos: undefined})
    this.view.dispatch(tr)
    this.view.focus()
  }

  onChangeLang = () => {
    const tr = this.view.state.tr
    tr.setMeta(pluginKey, {showMenu: false, ref: undefined, pos: undefined})
    tr.setSelection(Selection.near(tr.doc.resolve(this.pos)))
    this.view.dispatch(tr)
    this.view.focus()
    const dom = this.view.domAtPos(this.pos + 1)
    ;(dom.node as any)?.CodeMirror?.changeLang()
  }

  constructor(private view: EditorView) {
    this.update(view)
  }

  createNav() {
    const resolvedPos = this.view.state.doc.resolve(this.pos + 1)
    const node = resolvedPos.node()

    this.tooltip = document.createElement('div')
    this.tooltip.className = 'block-tooltip'
    this.tooltip.style.display = 'block'

    if (node.type.name === 'code_block') {
      const changeLang = document.createElement('div')
      changeLang.textContent = '💱 change language'
      changeLang.addEventListener('click', this.onChangeLang)
      changeLang.dataset.testid = 'change-lang'
      this.tooltip.appendChild(changeLang)

      const prettify = document.createElement('div')
      prettify.textContent = '💅 prettify'
      prettify.addEventListener('click', this.onPrettify)
      prettify.dataset.testid = 'prettify'
      this.tooltip.appendChild(prettify)

      const divider = document.createElement('hr')
      divider.classList.add('divider')
      this.tooltip.appendChild(divider)
    }

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

    this.view.dom.parentNode.appendChild(this.tooltip)
  }

  update(view: EditorView) {
    const {showMenu, ref, pos} = pluginKey.getState(view.state)

    if (!showMenu) {
      if (this.cleanup) {
        this.cleanup = this.cleanup()
      }

      document.removeEventListener('mousedown', this.onClose)
      this.tooltip?.remove()
      this.tooltip = undefined
      return
    }

    if (showMenu && this.cleanup) {
      return
    }

    this.pos = pos
    this.createNav()
    document.addEventListener('mousedown', this.onClose)

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
        this.tooltip.style.left = `${x}px`
        this.tooltip.style.top = `${y}px`
        const side = placement.split('-')[0]
        const staticSide = {
          top: 'bottom',
          right: 'left',
          bottom: 'top',
          left: 'right'
        }[side]

        if (middlewareData.arrow) {
          const {x, y} = middlewareData.arrow
          Object.assign(this.arrow.style, {
            left: x != null ? `${x}px` : '',
            top: y != null ? `${y}px` : '',
            [staticSide]: `${-this.arrow.offsetWidth / 2}px`
          });
        }
      })
    })
  }
}

export const pluginKey = new PluginKey('block-menu')

const blockMenu = new Plugin({
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
        if (target.classList.contains('block-handle')) {
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
  plugins: (prev) => [...prev, blockMenu]
})