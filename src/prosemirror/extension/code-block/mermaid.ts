import {EditorView, ViewPlugin, ViewUpdate} from '@codemirror/view'
import {language} from '@codemirror/language'
import {v4 as uuidv4} from 'uuid'
import mermaid from 'mermaid'
import {CodeBlockView} from './view'

export default (codeBlock: CodeBlockView) =>
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
        codeBlock.outer.removeChild(this.button)
      }
      this.button = null
    }

    update(update: ViewUpdate) {
      if (!this.button) {
        this.renderDOM()
        this.updateDOM()
      }

      if (
        update.docChanged ||
        update.startState.facet(language) != update.state.facet(language)
      ) {
        this.updateDOM()
      }
    }

    renderDOM() {
      const div = document.createElement('div')
      div.className = 'mermaid'
      div.id = `mermaid-${this.id}`
      this.button = div
      codeBlock.outer.appendChild(this.button)
    }

    updateDOM() {
      if (codeBlock.getLang() !== 'mermaid') {
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
          theme: codeBlock.options.dark ? 'dark' : 'default',
          fontFamily: codeBlock.options.font,
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
