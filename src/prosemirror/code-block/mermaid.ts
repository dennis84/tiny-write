import {EditorView, ViewPlugin, ViewUpdate} from '@codemirror/view'
import {language} from '@codemirror/language'
import {v4 as uuidv4} from 'uuid'
import mermaid from 'mermaid'
import {CodeBlockView} from './view'
import {saveSvg} from '@/remote'
import {CompletionSource} from '@codemirror/autocomplete'

const syntax = {
  flowchart: [
    'subgraph',
  ],
  sequenceDiagram: [
    'actor',
    'activate',
    'deactivate',
    'participant',
    'autonumber',
  ],
  classDiagram: [
    'class',
    '<<interface>>',
    '<<enumeration>>',
  ],
}

export const mermaidKeywords: CompletionSource = (context) => {
  const word = context.matchBefore(/\w*/)
  if (word.from == word.to && !context.explicit) {
    return null
  }

  const type = context.state.doc.line(1).text
  const keywords = syntax[type] ?? Object.keys(syntax)

  return {
    from: word.from,
    options: keywords.map((label: string) => ({label, type: 'keyword'})),
  }
}

export const mermaidView = (codeBlock: CodeBlockView) =>
  ViewPlugin.fromClass(class {
    id = uuidv4()
    output: HTMLElement
    download: HTMLElement

    constructor(private view: EditorView) {}

    destroy() {
      if (this.output) this.output.remove()
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
      this.output = div
      this.view.dom.appendChild(this.output)

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
      if (codeBlock.lang !== 'mermaid') {
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
        theme: codeBlock.options.dark ? 'dark' : 'default',
        fontFamily: `${codeBlock.options.font}, monospace`,
      })

      try {
        mermaid.render(`mermaid-graph-${this.id}`, content, (svgCode) => {
          this.output.innerHTML = svgCode
          this.output.appendChild(this.download)
        })
      } catch (err) {
        const error = document.createElement('code')
        error.textContent = err
        this.output.innerHTML = ''
        this.output.appendChild(error)
        // remove mermaid error div
        const errorDiv = document.getElementById(`dmermaid-graph-${this.id}`)
        errorDiv?.remove()
      }
    }
  })
