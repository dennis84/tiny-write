import {Plugin, NodeSelection, PluginKey, Selection} from 'prosemirror-state'
import {DecorationSet, Decoration, EditorView} from 'prosemirror-view'
import {setBlockType} from 'prosemirror-commands'
import {arrow, autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom'
import {ProseMirrorExtension} from '@/prosemirror'
import * as remote from '@/remote'

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

class TooltipView {
  private tooltip?: HTMLElement
  private arrow?: HTMLElement
  private cleanup: any
  private pos?: number

  constructor(private view: EditorView) {
    this.update(view)
  }

  createNav() {
    if (this.pos === undefined) return
    const resolvedPos = this.view.state.doc.resolve(this.pos + 1)
    const node = resolvedPos.node()
    const dom = this.view.domAtPos(this.pos + 1)

    this.tooltip = document.createElement('div')
    this.tooltip.className = 'block-tooltip'
    this.tooltip.style.display = 'block'

    if (node.type.name === 'code_block') {
      const changeLang = document.createElement('div')
      changeLang.textContent = '💱 change language'
      changeLang.addEventListener('click', this.onChangeLang)
      changeLang.dataset.testid = 'change_lang'
      this.tooltip.appendChild(changeLang)

      const prettify = document.createElement('div')
      prettify.textContent = '💅 prettify'
      prettify.addEventListener('click', this.onPrettify)
      prettify.dataset.testid = 'prettify'
      this.tooltip.appendChild(prettify)

      const foldAll = document.createElement('div')
      foldAll.textContent = '🙏 fold all'
      foldAll.addEventListener('click', this.onFoldAll)
      foldAll.dataset.testid = 'fold_all'
      this.tooltip.appendChild(foldAll)

      if ((dom.node as HTMLElement).dataset.lang === 'mermaid') {
        const mermaid = document.createElement('div')
        mermaid.textContent = '💾 save as png'
        mermaid.addEventListener('click', this.onMermaidSave)
        mermaid.dataset.testid = 'mermaid'
        this.tooltip.appendChild(mermaid)

        const hideCode = document.createElement('div')
        hideCode.textContent = node.attrs.hidden ? '🙉 Show code' : '🙈 Hide code'
        hideCode.addEventListener('click', this.onMermaidHideCode)
        this.tooltip.appendChild(hideCode)
      }

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

    this.view.dom.parentNode?.appendChild(this.tooltip)
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
    if (!this.tooltip || !this.arrow) return
    document.addEventListener('mousedown', this.onClose)

    this.cleanup = autoUpdate(ref, this.tooltip, () => {
      if (!this.tooltip || !this.arrow) return
      computePosition(ref, this.tooltip, {
        placement: 'left',
        middleware: [
          offset(10),
          flip(),
          shift(),
          arrow({element: this.arrow}),
        ],
      }).then(({x, y, placement, middlewareData}) => {
        if (!this.tooltip || !this.arrow) return
        this.tooltip.style.left = `${x}px`
        this.tooltip.style.top = `${y}px`
        const side = placement.split('-')[0]
        const staticSide = {
          top: 'bottom',
          right: 'left',
          bottom: 'top',
          left: 'right'
        }[side] ?? 'top'

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

  private onPrettify = () => {
    if (this.pos === undefined) return
    const dom = this.view.domAtPos(this.pos + 1)
    dom.node.dispatchEvent(new CustomEvent('cm:user_event', {
      detail: {userEvent: 'prettify'},
    }))

    const tr = this.view.state.tr
    tr.setMeta(pluginKey, {showMenu: false, ref: undefined, pos: undefined})
    this.view.dispatch(tr)
    this.view.focus()
  }

  private onFoldAll = () => {
    if (this.pos === undefined) return
    const dom = this.view.domAtPos(this.pos + 1)
    dom.node.dispatchEvent(new CustomEvent('cm:user_event', {
      detail: {userEvent: 'fold_all'},
    }))

    const tr = this.view.state.tr
    tr.setMeta(pluginKey, {showMenu: false, ref: undefined, pos: undefined})
    this.view.dispatch(tr)
    this.view.focus()
  }

  private onChangeLang = () => {
    if (this.pos === undefined) return
    const tr = this.view.state.tr
    const pos = tr.doc.resolve(this.pos + 1)
    const node = pos.node()
    if (node.type.name !== 'code_block') return

    tr.setMeta(pluginKey, {showMenu: false, ref: undefined, pos: undefined})
    tr.setSelection(Selection.near(tr.doc.resolve(this.pos)))
    tr.setNodeAttribute(this.pos, 'hidden', false)
    this.view.dispatch(tr)
    this.view.focus()
    const dom = this.view.domAtPos(this.pos + 1)
    dom.node.dispatchEvent(new CustomEvent('cm:user_event', {
      detail: {userEvent: 'change-lang'},
    }))
  }

  private onMermaidSave = () => {
    const id = `mermaid-graph-${this.pos}`
    const svg = document.getElementById(id)
    if (svg) remote.saveSvg(svg)
  }

  private onMermaidHideCode = () => {
    if (this.pos === undefined) return
    const tr = this.view.state.tr
    const pos = tr.doc.resolve(this.pos + 1)
    const node = pos.node()
    if (node.type.name !== 'code_block') return

    tr.setMeta(pluginKey, {showMenu: false, ref: undefined, pos: undefined})
    tr.setNodeAttribute(this.pos, 'hidden', !node.attrs.hidden)
    this.view.dispatch(tr)
    this.view.focus()
  }

  private onClose = (e: MouseEvent) => {
    if (!(e.target as Element).closest('.block-tooltip')) {
      const tr = this.view.state.tr
      tr.setMeta(pluginKey, {showMenu: false, ref: undefined, pos: undefined})
      this.view.dispatch(tr)
    }
  }

  private onToPlain = () => {
    if (this.pos === undefined) return
    const toPlain = setBlockType(this.view.state.schema.nodes.paragraph)
    toPlain(this.view.state, this.view.dispatch)
    const tr = this.view.state.tr
    const pos = tr.doc.resolve(this.pos)
    if (!pos.nodeAfter) return
    tr.removeMark(pos.pos, pos.pos + pos.nodeAfter.nodeSize)
    tr.setMeta(pluginKey, {showMenu: false, ref: undefined, pos: undefined})
    this.view.dispatch(tr)
    this.view.focus()
  }

  private onRemoveBlock = () => {
    if (this.pos === undefined) return
    const tr = this.view.state.tr
    const pos = tr.doc.resolve(this.pos)
    if (!pos.nodeAfter) return
    tr.delete(pos.pos, pos.pos + pos.nodeAfter.nodeSize)
    tr.setMeta(pluginKey, {showMenu: false, ref: undefined, pos: undefined})
    this.view.dispatch(tr)
    this.view.focus()
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
      const action = tr.getMeta(pluginKey)
      return action ?? prev
    },
  },
  view(editorView) {
    return new TooltipView(editorView)
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
