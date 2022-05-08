import {EditorView, ViewPlugin, ViewUpdate, keymap} from '@codemirror/view'
import {EditorState} from '@codemirror/state'
import {standardKeymap} from '@codemirror/commands'
import {StreamLanguage} from '@codemirror/language'
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
import logos from './logos'
import {getTheme} from './theme'
import {cleanLang} from '.'

interface Config {
  lang: string;
  fontSize: number;
  theme: string;
  onClose: () => void;
  onChange: (lang: string) => void;
}

export const changeLang = (config: Config) =>
  ViewPlugin.fromClass(class {
    view: EditorView
    toggle: HTMLElement
    select: HTMLElement
    inputEditor: LangInputEditor

    constructor(view: EditorView) {
      this.view = view
    }

    destroy() {
      if (this.toggle) {
        this.updateDOM()
        this.view.dom.parentNode.parentNode.removeChild(this.toggle)
        this.view.dom.parentNode.removeChild(this.select)
      }
      this.toggle = null
      this.select = null
      this.inputEditor?.destroy()
    }

    update(update: ViewUpdate) {
      if (!this.toggle) {
        this.renderDOM()
        this.updateDOM()
      }

      if (update.docChanged) {
        this.updateDOM()
      }
    }

    renderDOM() {
      const [, themeConfig] = getTheme(config.theme)

      this.toggle = document.createElement('div')
      this.toggle.className = 'lang-toggle'

      const input = document.createElement('div')
      input.className = 'lang-input'
      this.select = document.createElement('div')
      this.select.className = 'lang-select'
      this.select.textContent = '```'
      this.select.style.display = 'none'
      this.select.style.color = themeConfig.foreground
      this.select.appendChild(input)

      this.inputEditor = new LangInputEditor({
        doc: config.lang,
        parent: input,
        onClose: () => {
          this.select.style.display = 'none'
          this.toggle.style.display = 'flex'
          config.onClose()
        },
        onEnter: (lang) => {
          this.select.style.display = 'none'
          this.toggle.style.display = 'flex'
          config.onChange(lang)
        },
      })

      this.toggle.addEventListener('click', () => {
        this.toggle.style.display = 'none'
        this.select.style.display = 'flex'
        this.inputEditor.focus()
      })

      this.view.dom.parentNode.prepend(this.select)
      this.view.dom.parentNode.parentNode.appendChild(this.toggle)
    }

    updateDOM() {
      const lang = config.lang
      let elem: Element
      if (logos[lang]) {
        const img = document.createElement('img')
        img.src = logos[lang]
        img.width = config.fontSize
        img.height = config.fontSize
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
  onClose: () => void;
  onEnter: (lang: string) => void;
}

export class LangInputEditor {
  private props: Props
  private view: EditorView
  private doc: string

  constructor(props: Props) {
    this.props = props
    this.doc = props.doc
    this.view = new EditorView({
      state: EditorState.create({
        doc: props.doc,
        extensions: [
          EditorView.domEventHandlers({
            'blur': () => {
              this.reset()
              props.onClose()
              return true
            }
          }),
          keymap.of([{
            key: 'Enter',
            run: (editorView) => {
              const lang = cleanLang(editorView.state.doc.lineAt(0).text.trim())
              this.doc = lang
              this.props.onEnter(lang)
              return true
            },
          }, {
            key: 'Escape',
            run: () => {
              this.reset()
              props.onClose()
              return true
            }
          }, ...standardKeymap])
        ]
      }),
      parent: props.parent,
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

export const highlight = (lang: string) =>
  lang === 'javascript' || lang === 'jsx' ? javascript() :
  lang === 'typescript' || lang === 'tsx' ? javascript({typescript: true}) :
  lang === 'java' || lang === 'kotlin' ? java() :
  lang === 'rust' ? rust() :
  lang === 'sql' ? sql() :
  lang === 'json' ? json() :
  lang === 'python' ? python() :
  lang === 'html' ? html() :
  lang === 'css' ? css() :
  lang === 'cpp' ? cpp() :
  lang === 'markdown' ? markdown() :
  lang === 'xml' ? xml() :
  lang === 'haskell' ? StreamLanguage.define(haskell) :
  lang === 'clojure' ? StreamLanguage.define(clojure) :
  lang === 'erlang' ? StreamLanguage.define(erlang) :
  lang === 'groovy' ? StreamLanguage.define(groovy) :
  lang === 'ruby' ? StreamLanguage.define(ruby) :
  lang === 'hcl' ? StreamLanguage.define(ruby) :
  lang === 'mermaid' ? StreamLanguage.define(ruby) :
  lang === 'bash' ? StreamLanguage.define(shell) :
  lang === 'yaml' ? StreamLanguage.define(yaml) :
  lang === 'go' ? StreamLanguage.define(go) :
  lang === 'toml' ? StreamLanguage.define(toml) :
  markdown()
