import {EditorView, ViewPlugin, ViewUpdate} from '@codemirror/view'
import {setDiagnostics} from '@codemirror/lint'
import prettier from 'prettier'
import parserBabel from 'prettier/parser-babel'
import parserTypescript from 'prettier/parser-typescript'
import parserCss from 'prettier/parser-postcss'
import parserHtml from 'prettier/parser-html'
import parserMarkdown from 'prettier/parser-markdown'
import parserYaml from 'prettier/parser-yaml'
import {PrettierConfig} from '../../../state'

interface Config {
  lang: string;
  prettier: PrettierConfig;
}

export default (config: Config) =>
  ViewPlugin.fromClass(class {
    view: EditorView
    button: HTMLElement
    prettified = false
    error = false

    constructor(view: EditorView) {
      this.view = view
    }
    destroy() {
      if (this.button) {
        this.updateDOM()
        this.view.dom.parentNode.removeChild(this.button)
      }
      this.button = null
    }

    update(update: ViewUpdate) {
      if (!this.button) {
        this.button = this.toDOM()
        this.updateDOM()
        this.view.dom.parentNode.appendChild(this.button)
      }

      if (update.docChanged) {
        this.updateDOM()
      }
    }

    toDOM(): HTMLElement {
      const span = document.createElement('span')
      span.className = 'prettify'
      span.setAttribute('title', 'prettify')
      span.addEventListener('mousedown', () => {
        this.prettify()
        this.updateDOM()
      })

      return span
    }

    updateDOM() {
      if (this.view.state.doc.length > 0 && (
        config.lang === 'javascript' ||
        config.lang === 'typescript' ||
        config.lang === 'css' ||
        config.lang === 'html' ||
        config.lang === 'scss' ||
        config.lang === 'less' ||
        config.lang === 'markdown' ||
        config.lang === 'yaml' ||
        config.lang === 'json'
      )) {
        this.button.textContent = '✨'
        this.button.style.display = 'block'
      } else {
        this.button.style.display = 'none'
        try {
          this.view.dispatch(setDiagnostics(this.view.state, []))
        } catch (e) {
          // ignore
        }
      }
    }

    prettify() {
      const [parser, plugin] =
        config.lang === 'javascript' ? ['babel', parserBabel] :
        config.lang === 'css' ? ['css', parserCss] :
        config.lang === 'markdown' ? ['markdown', parserMarkdown] :
        config.lang === 'html' ? ['html', parserHtml] :
        config.lang === 'less' ? ['less', parserCss] :
        config.lang === 'scss' ? ['scss', parserCss] :
        config.lang === 'yaml' ? ['yaml', parserYaml] :
        config.lang === 'json' ? ['json', parserBabel] :
        config.lang === 'typescript' ? ['typescript', parserTypescript] :
        [undefined, undefined]
      if (!parser) return
      try {
        const value = prettier.format(this.view.state.doc.toString(), {
          parser,
          plugins: [plugin],
          trailingComma: 'all',
          bracketSpacing: false,
          ...config.prettier,
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
