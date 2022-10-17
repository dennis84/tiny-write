import {EditorView, ViewPlugin, ViewUpdate} from '@codemirror/view'
import {language} from '@codemirror/language'
import {setDiagnostics} from '@codemirror/lint'
import prettier from 'prettier'
import parserBabel from 'prettier/parser-babel'
import parserTypescript from 'prettier/parser-typescript'
import parserCss from 'prettier/parser-postcss'
import parserHtml from 'prettier/parser-html'
import parserMarkdown from 'prettier/parser-markdown'
import parserYaml from 'prettier/parser-yaml'
import {CodeBlockView} from './view'

export default (codeBlock: CodeBlockView) =>
  ViewPlugin.fromClass(class {
    button: HTMLElement
    prettified = false
    error = false

    constructor(private view: EditorView) {}

    destroy() {
      if (this.button) {
        this.updateDOM()
        this.button.remove()
      }
      this.button = null
    }

    update(update: ViewUpdate) {
      if (!this.button) {
        this.renderDOM()
        this.updateDOM()
      }

      if (update.docChanged) {
        this.updateDOM()
      } else if (update.startState.facet(language) != update.state.facet(language)) {
        this.updateDOM()
        setTimeout(() => {
          this.view.dispatch(setDiagnostics(this.view.state, []))
        })
      }
    }

    renderDOM() {
      const span = document.createElement('span')
      span.className = 'prettify'
      span.setAttribute('title', 'prettify')
      span.addEventListener('mousedown', () => {
        this.prettify()
        this.updateDOM()
        setTimeout(() => codeBlock.editorView.focus())
      })

      this.button = span
      codeBlock.inner.appendChild(this.button)
    }

    updateDOM() {
      const lang = codeBlock.getLang()
      if (this.view.state.doc.length > 0 && (
        lang === 'javascript' ||
        lang === 'jsx' ||
        lang === 'js' ||
        lang === 'typescript' ||
        lang === 'tsx' ||
        lang === 'ts' ||
        lang === 'css' ||
        lang === 'html' ||
        lang === 'scss' ||
        lang === 'less' ||
        lang === 'markdown' ||
        lang === 'yaml' ||
        lang === 'json'
      )) {
        this.button.textContent = '✨'
        this.button.style.display = 'block'
      } else {
        this.button.style.display = 'none'
      }
    }

    prettify() {
      const lang = codeBlock.getLang()
      const [parser, plugin] =
        lang === 'javascript' || lang === 'js' || lang === 'jsx' ? ['babel', parserBabel] :
        lang === 'css' ? ['css', parserCss] :
        lang === 'markdown' ? ['markdown', parserMarkdown] :
        lang === 'html' ? ['html', parserHtml] :
        lang === 'less' ? ['less', parserCss] :
        lang === 'scss' ? ['scss', parserCss] :
        lang === 'yaml' ? ['yaml', parserYaml] :
        lang === 'json' ? ['json', parserBabel] :
        lang === 'typescript' || lang === 'ts' || lang === 'tsx' ? ['typescript', parserTypescript] :
        [undefined, undefined]
      if (!parser) return
      try {
        const value = prettier.format(this.view.state.doc.toString(), {
          parser,
          plugins: [plugin],
          trailingComma: 'all',
          bracketSpacing: false,
          ...codeBlock.getOptions().prettier,
        })

        this.view.dispatch({
          changes: {
            from: 0,
            to: this.view.state.doc.length,
            insert: value.substring(0, value.lastIndexOf('\n')),
          }
        })

        setTimeout(() => this.button.textContent = '')
      } catch (err) {
        if (!err.loc?.start?.line) return
        const line = this.view.state.doc.line(err.loc.start.line)
        const lines = err.message.split('\n')
        const diagnostics = lines.map((message: string) => ({
          from: line.from + err.loc.start.column - 1,
          to: line.from + err.loc.start.column - 1,
          severity: 'error',
          message: message,
        }))

        this.view.dispatch(setDiagnostics(this.view.state, diagnostics))
        setTimeout(() => this.button.textContent = '🚨')
      }
    }
  })
