import {type EditorView, ViewPlugin, type ViewUpdate} from '@codemirror/view'
import {language} from '@codemirror/language'
import mermaid from 'mermaid'
import type {CodeBlockView} from './CodeBlockView'

export const createMermaidPlugin = (codeBlock: CodeBlockView) =>
  ViewPlugin.fromClass(
    class {
      id = codeBlock.getPos()
      output: HTMLElement

      constructor(private view: EditorView) {
        const div = document.createElement('div')
        div.className = 'mermaid'
        this.output = div
        this.view.dom.appendChild(this.output)
        void this.updateDOM()
      }

      destroy() {
        if (this.output) this.output.remove()
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.startState.facet(language) !== update.state.facet(language)
        ) {
          void this.updateDOM()
        }
      }

      async updateDOM() {
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
          theme: codeBlock.configService.codeTheme.dark ? 'dark' : 'default',
          fontFamily: `${codeBlock.configService.fontFamily}, monospace`,
        })

        try {
          await mermaid.parse(content)
        } catch (err: any) {
          const error = document.createElement('code')
          error.textContent = err
          this.output.innerHTML = ''
          this.output.appendChild(error)
          // remove mermaid error div
          const errorDiv = document.getElementById(`dmermaid-graph-${this.id}`)
          errorDiv?.remove()
          return
        }

        try {
          const result = await mermaid.render(`mermaid-graph-${this.id}`, content)
          this.output.innerHTML = result.svg
        } catch (_err) {
          // ignore
        }
      }
    },
  )
