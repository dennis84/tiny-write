import {EditorView, ViewPlugin, ViewUpdate} from '@codemirror/view'
import {language} from '@codemirror/language'
import {v4 as uuidv4} from 'uuid'
import mermaid from 'mermaid'
import {CodeBlockView} from './view'
import {saveSvg} from '../../../remote'

export default (codeBlock: CodeBlockView) =>
  ViewPlugin.fromClass(class {
    id = uuidv4()
    output: HTMLElement
    download: HTMLElement

    constructor(private view: EditorView) {}

    destroy() {
      if (this.output) {
        codeBlock.outer.removeChild(this.output)
      }
      this.output = null
    }

    update(update: ViewUpdate) {
      if (!this.output) {
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
      this.output = div
      codeBlock.outer.appendChild(this.output)

      const span = document.createElement('span')
      span.className = 'download'
      span.setAttribute('title', 'download')
      span.textContent = '💾'
      span.addEventListener('mousedown', () => {
        const id = `mermaid-graph-${this.id}`
        const svg = document.getElementById(id)
        saveSvg(svg)
      })

      this.download = span
      this.output.appendChild(this.download)
    }

    updateDOM() {
      if (codeBlock.getLang() !== 'mermaid') {
        this.output.style.display = 'none'
        return
      }

      const content = this.view.state.doc.toString()
      if (!content) {
        this.output.style.display = 'none'
        return
      }

      this.output.style.display = 'flex'
      mermaid.initialize({
        startOnLoad: false,
        theme: codeBlock.getOptions().dark ? 'dark' : 'default',
        fontFamily: `${codeBlock.getOptions().font}, monospace`,
      })

      // fixes cut off text
      setTimeout(() => {
        try {
          mermaid.render(`mermaid-graph-${this.id}`, content, (svgCode) => {
            this.output.innerHTML = svgCode
            this.output.appendChild(this.download)
          })
        } catch (err) {
          const error = document.createElement('code')
          error.textContent = err.message
          this.output.innerHTML = ''
          this.output.appendChild(error)
          const errorDiv = document.getElementById(`dmermaid-graph-${this.id}`)
          if (errorDiv) document.body.removeChild(errorDiv)
        }
      }, 100)
    }
  })
