import {EditorView, ViewPlugin, ViewUpdate} from '@codemirror/view'
import {v4 as uuidv4} from 'uuid'
import mermaid from 'mermaid'

interface Config {
  lang: string;
  dark: boolean;
  font: string;
}

export default (config: Config) =>
  ViewPlugin.fromClass(class {
    id = uuidv4()
    view: EditorView
    button: HTMLElement

    constructor(view: EditorView) {
      this.view = view
    }

    destroy() {
      if (this.button) {
        this.updateDOM()
        this.view.dom.parentNode.parentNode.removeChild(this.button)
      }
      this.button = null
    }

    update(update: ViewUpdate) {
      if (!this.button) {
        this.button = this.toDOM()
        this.updateDOM()
        this.view.dom.parentNode.parentNode.appendChild(this.button)
      }

      if (update.docChanged) {
        this.updateDOM()
      }
    }

    toDOM(): HTMLElement {
      const div = document.createElement('div')
      div.className = 'mermaid'
      div.id = `mermaid-${this.id}`
      return div
    }

    updateDOM() {
      if (config.lang !== 'mermaid') {
        this.button.style.display = 'none'
        return
      }

      const content = this.view.state.doc.toString()
      if (!content) {
        this.button.style.display = 'none'
        return
      }

      try {
        this.button.style.display = 'flex'
        mermaid.initialize({
          startOnLoad: false,
          theme: config.dark ? 'dark' : 'default',
          fontFamily: config.font,
        })
        mermaid.render(`mermaid-graph-${this.id}`, content, (svgCode) => {
          this.button.innerHTML = svgCode
        })
      } catch (err) {
        const error = document.createElement('code')
        error.textContent = err.message
        this.button.innerHTML = ''
        this.button.appendChild(error)
      }
    }
  })
