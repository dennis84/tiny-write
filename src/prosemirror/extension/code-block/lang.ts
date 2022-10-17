import {EditorView, ViewPlugin, ViewUpdate, keymap} from '@codemirror/view'
import {Extension} from '@codemirror/state'
import {standardKeymap} from '@codemirror/commands'
import {StreamLanguage, language, LanguageSupport} from '@codemirror/language'
import {acceptCompletion, autocompletion, moveCompletionSelection} from '@codemirror/autocomplete'
import {haskell} from '@codemirror/legacy-modes/mode/haskell'
import {clojure} from '@codemirror/legacy-modes/mode/clojure'
import {erlang} from '@codemirror/legacy-modes/mode/erlang'
import {groovy} from '@codemirror/legacy-modes/mode/groovy'
import {ruby} from '@codemirror/legacy-modes/mode/ruby'
import {shell} from '@codemirror/legacy-modes/mode/shell'
import {yaml} from '@codemirror/legacy-modes/mode/yaml'
import {go} from '@codemirror/legacy-modes/mode/go'
import {toml} from '@codemirror/legacy-modes/mode/toml'
import {javascript} from '@codemirror/lang-javascript'
import {java} from '@codemirror/lang-java'
import {rust} from '@codemirror/lang-rust'
import {sql} from '@codemirror/lang-sql'
import {json} from '@codemirror/lang-json'
import {python} from '@codemirror/lang-python'
import {html} from '@codemirror/lang-html'
import {css} from '@codemirror/lang-css'
import {cpp} from '@codemirror/lang-cpp'
import {markdown} from '@codemirror/lang-markdown'
import {xml} from '@codemirror/lang-xml'
import * as logos from './logos'
import {getTheme} from './theme'
import {CodeBlockView} from './view'

interface Config {
  onClose: () => void;
  onChange: (lang: string) => void;
}

export const changeLang = (codeBlock: CodeBlockView, config: Config) =>
  ViewPlugin.fromClass(class {
    toggle: HTMLElement
    input: HTMLElement
    inputEditor: LangInputEditor
    lang = codeBlock.getLang()

    constructor(private view: EditorView) {}

    destroy() {
      if (this.toggle) {
        this.updateDOM()
        this.toggle.remove()
        this.input.remove()
      }
      this.toggle = null
      this.input = null
      this.inputEditor?.destroy()
    }

    update(update: ViewUpdate) {
      if (!this.toggle) {
        this.renderDOM()
        this.updateDOM()
      }

      if (
        update.docChanged ||
        update.startState.facet(language) != update.state.facet(language)
      ) {
        this.lang = codeBlock.getLang()
        this.updateDOM()
      }
    }

    renderDOM() {
      const theme = getTheme(codeBlock.getOptions().theme)

      this.toggle = document.createElement('div')
      this.toggle.className = 'lang-toggle'

      this.input = document.createElement('div')
      this.input.className = 'lang-input'
      this.input.style.display = 'none'

      this.inputEditor = new LangInputEditor({
        theme,
        doc: this.lang,
        parent: this.input,
        onClose: () => {
          this.input.style.display = 'none'
          this.toggle.style.display = 'flex'
          config.onClose()
        },
        onEnter: (lang) => {
          this.input.style.display = 'none'
          this.toggle.style.display = 'flex'
          config.onChange(lang)
        },
      })

      this.toggle.addEventListener('click', () => {
        this.toggle.style.display = 'none'
        this.input.style.display = 'flex'
        this.inputEditor.focus()
      })

      codeBlock.inner.prepend(this.input)
      codeBlock.outer.appendChild(this.toggle)
    }

    updateDOM() {
      const lang = this.lang
      const {fontSize} = codeBlock.getOptions()
      const cur = this.toggle?.children[0]?.getAttribute('title')
      if (cur === lang) return

      let elem: Element
      if (logos[lang]) {
        const img = document.createElement('img')
        img.src = logos[lang]
        img.width = fontSize
        img.height = fontSize
        img.setAttribute('title', lang)
        elem = img
      } else {
        elem = document.createElement('span')
        elem.textContent = lang === 'mermaid' ? '🧜‍♀️' : '📜'
        elem.setAttribute('title', lang)
      }

      this.toggle.innerHTML = ''
      this.toggle.appendChild(elem)
    }
  })

interface Props {
  doc: string;
  parent: Element;
  theme: Extension;
  onClose: () => void;
  onEnter: (lang: string) => void;
}

export class LangInputEditor {
  private view: EditorView
  private doc: string

  constructor(private props: Props) {
    this.doc = this.props.doc
    this.view = new EditorView({
      doc: this.props.doc,
      parent: this.props.parent,
      extensions: [
        props.theme,
        autocompletion({
          defaultKeymap: false,
          override: [() => ({
            options: Object.keys(mapping).map((label) => ({label, type: 'word'})),
            from: 0,
          })]
        }),
        EditorView.domEventHandlers({
          'blur': () => {
            this.reset()
            this.props.onClose()
            return true
          }
        }),
        keymap.of([
          {
            key: 'ArrowDown',
            run: moveCompletionSelection(true),
          },
          {
            key: 'ArrowUp',
            run: moveCompletionSelection(false),
          },
          {
            key: 'Enter',
            run: (editorView) => {
              acceptCompletion(editorView)
              const lang = editorView.state.doc.lineAt(0).text.trim()
              this.doc = lang
              this.props.onEnter(lang)
              return true
            },
          }, {
            key: 'Escape',
            run: () => {
              this.reset()
              this.props.onClose()
              return true
            }
          },
          ...standardKeymap,
        ])
      ],
    })
  }

  destroy() {
    this.view.destroy()
  }

  focus() {
    this.view.focus()
    this.view.dispatch({
      selection: {anchor: 0, head: this.view.state.doc.length}
    })
  }

  containsElem(elem: Element) {
    return this.view.dom.contains(elem)
  }

  private reset() {
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: this.doc,
      }
    })
  }
}

const langSupport = (l) => new LanguageSupport(StreamLanguage.define(l))

const mapping = {
  javascript: () => javascript(),
  js: () => javascript(),
  jsx: () => javascript({jsx: true}),
  typescript: () => javascript({typescript: true}),
  ts: () => javascript({typescript: true}),
  tsx: () => javascript({jsx: true, typescript: true}),
  java: () => java(),
  kotlin: () => java(),
  rust: () => rust(),
  sql: () => sql(),
  json: () => json(),
  python: () => python(),
  html: () => html(),
  css: () => css(),
  cpp: () => cpp(),
  markdown: () => markdown(),
  xml: () => xml(),
  haskell: () => langSupport(haskell),
  clojure: () => langSupport(clojure),
  erlang: () => langSupport(erlang),
  groovy: () => langSupport(groovy),
  ruby: () => langSupport(ruby),
  hcl: () => langSupport(ruby),
  mermaid: () => langSupport(ruby),
  bash: () => langSupport(shell),
  yaml: () => langSupport(yaml),
  go: () => langSupport(go),
  toml: () => langSupport(toml),
}

export const highlight = (lang: string) => mapping[lang]?.() ?? markdown()
