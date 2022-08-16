import {EditorView, ViewPlugin, ViewUpdate} from '@codemirror/view'
import {CodeBlockView} from './view'

export default (codeBlock: CodeBlockView) =>
  ViewPlugin.fromClass(class {
    expand: HTMLElement
    expanded = false

    constructor(private view: EditorView) {}

    destroy() {
      this.expanded = false
      if (this.expand) {
        this.updateDOM()
        codeBlock.inner.removeChild(this.expand)
      }
      this.expand = null
    }

    update(update: ViewUpdate) {
      if (!this.expand) {
        this.renderDOM()
        this.updateDOM()
      }

      if (update.docChanged) {
        this.updateDOM()
      }
    }

    renderDOM() {
      const div = document.createElement('div')
      div.className = 'expand'
      div.addEventListener('click', () => {
        this.expanded = !this.expanded
        this.updateDOM()
      })

      this.expand = div
      codeBlock.inner.appendChild(this.expand)
    }

    updateDOM() {
      if (codeBlock.getLang() !== 'mermaid' && this.view.state.doc.lines > 10) {
        if (this.expanded) {
          this.view.dom.style.maxHeight = '100%'
          this.expand.textContent = '↑'
        } else {
          const height = 10 * codeBlock.options.fontSize * 1.8
          this.view.dom.style.maxHeight = height + 'px'
          this.expand.textContent = '↓'
        }

        this.expand.style.display = 'flex'
      } else {
        this.expanded = false
        this.expand.style.display = 'none'
        this.view.dom.style.maxHeight = ''
      }
    }
  })
