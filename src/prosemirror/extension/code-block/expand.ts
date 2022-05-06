import {EditorView, ViewPlugin, ViewUpdate} from '@codemirror/view'

interface Config {
  height: number;
  lang: string;
}

export const expand = (config: Config) =>
  ViewPlugin.fromClass(class {
    view: EditorView
    expand: HTMLElement
    expanded = false

    constructor(view: EditorView) {
      this.view = view
    }

    destroy() {
      this.expanded = false
      if (this.expand) {
        this.updateDOM()
        this.view.dom.parentNode.removeChild(this.expand)
      }
      this.expand = null
    }

    update(update: ViewUpdate) {
      if (!this.expand) {
        this.expand = this.toDOM()
        this.updateDOM()
        this.view.dom.parentNode.appendChild(this.expand)
      }

      if (update.docChanged) {
        this.updateDOM()
      }
    }

    toDOM(): HTMLElement {
      const div = document.createElement('div')
      div.className = 'expand'
      div.addEventListener('click', () => {
        this.expanded = !this.expanded
        this.updateDOM()
      })

      return div
    }

    updateDOM() {
      if (config.lang !== 'mermaid' && this.view.state.doc.lines > 10) {
        if (this.expanded) {
          this.view.dom.style.maxHeight = '100%'
          this.expand.textContent = '↑'
        } else {
          const height = config.height
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
