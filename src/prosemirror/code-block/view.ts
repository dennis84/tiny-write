import {EditorView as PmEditorView, Node} from 'prosemirror-view'
import {TextSelection} from 'prosemirror-state'
import {exitCode} from 'prosemirror-commands'
import {Compartment, EditorState, Extension} from '@codemirror/state'
import {EditorView, ViewUpdate, keymap} from '@codemirror/view'
import {defaultKeymap, defaultTabBinding} from '@codemirror/commands'
import {linter, setDiagnostics} from '@codemirror/lint'
import {StreamLanguage} from '@codemirror/stream-parser'
import {haskell} from '@codemirror/legacy-modes/mode/haskell'
import {clojure} from '@codemirror/legacy-modes/mode/clojure'
import {erlang} from '@codemirror/legacy-modes/mode/erlang'
import {groovy} from '@codemirror/legacy-modes/mode/groovy'
import {ruby} from '@codemirror/legacy-modes/mode/ruby'
import {shell} from '@codemirror/legacy-modes/mode/shell'
import {yaml} from '@codemirror/legacy-modes/mode/yaml'
import {go} from '@codemirror/legacy-modes/mode/go'
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
import {materialLight, config as materialLightConfig} from '@ddietr/codemirror-themes/theme/material-light'
import {materialDark, config as materialDarkConfig} from '@ddietr/codemirror-themes/theme/material-dark'
import {solarizedLight, config as solarizedLightConfig} from '@ddietr/codemirror-themes/theme/solarized-light'
import {solarizedDark, config as solarizedDarkConfig} from '@ddietr/codemirror-themes/theme/solarized-dark'
import {dracula, config as draculaConfig} from '@ddietr/codemirror-themes/theme/dracula'
import {githubLight, config as githubLightConfig} from '@ddietr/codemirror-themes/theme/github-light'
import {githubDark, config as githubDarkConfig} from '@ddietr/codemirror-themes/theme/github-dark'
import prettier from 'prettier'
import parserBabel from 'prettier/parser-babel'
import parserCss from 'prettier/parser-postcss'
import parserHtml from 'prettier/parser-html'
import parserMarkdown from 'prettier/parser-markdown'
import parserYaml from 'prettier/parser-yaml'
import logos from './logos'
import {CodeBlockProps, cleanLang, defaultProps} from '.'

export class CodeBlockView {
  node: Node
  view: PmEditorView
  getPos: () => number
  dom: Element
  editorView: EditorView
  updating = false
  clicked = false
  options: CodeBlockProps = defaultProps
  langToggle: HTMLElement
  prettifyBtn: HTMLElement
  dragHandle: HTMLElement
  langExtension: Compartment

  constructor(node, view, getPos, decos, innerDecos, options) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.options = options

    this.langToggle = document.createElement('div')
    this.prettifyBtn = document.createElement('span')
    this.prettifyBtn.className = 'prettify'
    this.prettifyBtn.textContent = '✨'
    this.prettifyBtn.style.display = 'none'
    this.prettifyBtn.setAttribute('title', 'prettify')
    this.prettifyBtn.addEventListener('mousedown', this.prettify.bind(this), true)
    this.updateLangSelect()
    this.updatePrettify()

    const outer = document.createElement('div')
    outer.setAttribute('contenteditable', 'false')
    outer.classList.add('codemirror-outer')
    const inner = document.createElement('div')
    inner.classList.add('codemirror-inner')
    outer.appendChild(inner)

    const langInput = document.createElement('span')
    langInput.className = 'lang-input'
    langInput.textContent = this.getLang()
    langInput.setAttribute('contenteditable', '')
    langInput.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        e.preventDefault()
        const lang = cleanLang(langInput.textContent.trim())
        langInput.textContent = lang
        langSelect.style.display = 'none'
        langSelectBottom.style.display = 'none'
        this.langToggle.style.display = 'flex'
        this.prettifyBtn.style.display = 'block'
        const tr = view.state.tr
        tr.setNodeMarkup(getPos(), undefined, {
          ...this.node.attrs,
          params: {...this.node.attrs.params, lang},
        })
        view.dispatch(tr)
        this.reconfigure()
        this.updateLangSelect()
        this.updatePrettify()
        this.editorView.focus()
      }
    })

    langInput.addEventListener('blur', () => {
      langSelect.style.display = 'none'
      langSelectBottom.style.display = 'none'
      this.langToggle.style.display = 'flex'
    })

    const langSelect = document.createElement('div')
    langSelect.className = 'lang-select'
    langSelect.textContent = '```'
    langSelect.style.display = 'none'
    langSelect.appendChild(langInput)
    const langSelectBottom = document.createElement('div')
    langSelectBottom.className = 'lang-select'
    langSelectBottom.textContent = '```'
    langSelectBottom.style.display = 'none'

    this.langToggle.className = 'lang-toggle'
    this.langToggle.addEventListener('click', () => {
      this.langToggle.style.display = 'none'
      langSelect.style.display = 'block'
      langSelectBottom.style.display = 'block'
      this.prettifyBtn.style.display = 'none'
      langInput.focus()
      const range = document.createRange()
      range.selectNodeContents(langInput)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    })

    const codeMirrorKeymap = keymap.of([{
      key: 'Backspace',
      run: () => {
        if (!this.editorView.state.doc.length) this.close()
        return true
      }
    }, {
      key: 'Ctrl-Enter',
      run: () => {
        if (exitCode(this.view.state, this.view.dispatch)) this.view.focus()
        return true
      }
    }, {
      key: 'ArrowUp',
      run: (editorView) => {
        const state = editorView.state
        const selection = state.selection
        const startPos = selection.main.head
        if (startPos === 0) {
          const tr = this.view.state.tr
          let targetPos = this.getPos() - 1
          if (this.getPos() === 0) {
            tr.insert(0, this.view.state.schema.node('paragraph'))
            targetPos = 0
          }

          const selection = new TextSelection(tr.doc.resolve(targetPos))
          tr.setSelection(selection).scrollIntoView()
          this.view.dispatch(tr)
          this.view.focus()
          return true
        }

        return false
      }
    }])

    const extensions = this.options.extensions ?
      this.options.extensions(this.view, this.node, this.getPos) :
      []

    this.langExtension = new Compartment

    const [theme, themeConfig] = getTheme(this.options.theme)
    inner.style.background = themeConfig.background
    langSelect.style.color = themeConfig.foreground
    langSelectBottom.style.color = themeConfig.foreground

    const startState = EditorState.create({
      doc: this.node.textContent,
      extensions: [
        extensions,
        keymap.of(defaultKeymap),
        keymap.of([defaultTabBinding]),
        linter(() => []),
        codeMirrorKeymap,
        EditorState.tabSize.of(2),
        this.langExtension.of(getLangExtension(this.getLang())),
        theme,
        EditorView.updateListener.of(this.updateListener.bind(this)),
        EditorView.domEventHandlers({
          'focus': () => this.forwardSelection(),
          'mousedown': () => {
            this.clicked = true
          }
        })
      ]
    })

    this.editorView = new EditorView({
      state: startState,
      parent: null,
    })

    inner.appendChild(langSelect)
    inner.appendChild(this.prettifyBtn)
    inner.appendChild(this.editorView.dom)
    inner.appendChild(langSelectBottom)
    outer.appendChild(this.langToggle)

    innerDecos.find().map((d) => {
      const elem = typeof d.type.toDOM === 'function' ? d.type.toDOM() : d.type.toDOM
      outer.appendChild(elem)
    })

    this.dom = outer
  }

  destroy() {
    this.editorView.destroy()
  }

  selectNode() {
    this.editorView.focus()
  }

  setSelection(anchor, head) {
    this.editorView.focus()
    this.updating = true
    this.editorView.dispatch({selection: {anchor, head}})
    this.updating = false
  }

  stopEvent() {
    return false
  }

  ignoreMutation() {
    return true
  }

  update(node) {
    if (node.type != this.node.type) return false
    const langChanged = node.attrs.params.lang !== this.node.attrs.params.lang
    this.node = node
    if (langChanged) {
      this.reconfigure()
      this.updateLangSelect()
    }

    this.updatePrettify()
    const change = computeChange(this.editorView.state.doc.toString(), node.textContent)
    if (change) {
      this.updating = true
      this.editorView.dispatch({
        changes: {from: change.from, to: change.to, insert: change.text}
      })

      this.updating = false
    }

    return true
  }

  close() {
    const offset = this.getPos()
    const tr = this.view.state.tr.deleteRange(
      Math.max(0, offset - 1),
      offset + this.node.content.size + 1
    )
    this.view.dispatch(tr)
    this.view.focus()
  }

  reconfigure() {
    this.editorView.dispatch({
      effects: [
        this.langExtension.reconfigure(getLangExtension(this.getLang())),
      ]
    })
  }

  forwardSelection() {
    if (!this.editorView.hasFocus) return
    const offset = this.getPos() + 1
    const anchor = this.editorView.state.selection.main.from + offset
    const head = this.editorView.state.selection.main.to + offset
    try {
      const sel = TextSelection.create(this.view.state.doc, anchor, head)
      if (!sel.eq(this.view.state.selection)) {
        this.view.dispatch(this.view.state.tr.setSelection(sel))
      }
    } catch (err) { /* ignore */ }
  }

  updateListener(update: ViewUpdate) {
    if (this.updating) return

    if (this.clicked) {
      this.clicked = false
      return
    }

    this.forwardSelection()
    const sel = update.state.selection.main
    if (this.editorView.hasFocus && sel.empty && this.options.typewriterMode) {
      const line = this.editorView.visualLineAt(sel.from)
      const {node} = this.editorView.domAtPos(line.from)
      ;(node as Element).scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      })
    }

    for (const tr of update.transactions) {
      if (!tr.changes.empty) {
        tr.changes.iterChanges((fromA, toA, fromB, toB, text) => {
          const offset = this.getPos() + 1
          const t = this.view.state.tr.replaceWith(
            offset + fromA,
            offset + toA,
            text.length > 0 ? this.view.state.schema.text(text.toString()) : null,
          )

          this.view.dispatch(t)
        })
      }
    }
  }

  updateLangSelect() {
    const lang = this.getLang()
    let elem
    if (logos[lang]) {
      elem = document.createElement('img')
      elem.src = logos[lang]
      elem.width = this.options.fontSize
      elem.height = this.options.fontSize
      elem.setAttribute('title', lang)
    } else {
      elem = document.createElement('span')
      elem.textContent = '📜'
      elem.setAttribute('title', lang)
    }

    this.langToggle.innerHTML = ''
    this.langToggle.appendChild(elem)
  }

  updatePrettify() {
    if (
      this.getLang() === 'javascript' ||
      this.getLang() === 'typescript' ||
      this.getLang() === 'css' ||
      this.getLang() === 'html' ||
      this.getLang() === 'scss' ||
      this.getLang() === 'less' ||
      this.getLang() === 'markdown' ||
      this.getLang() === 'yaml' ||
      this.getLang() === 'json'
    ) {
      this.prettifyBtn.textContent = '✨'
      this.prettifyBtn.style.display = 'block'
    } else {
      this.prettifyBtn.style.display = 'none'
    }
  }

  prettify() {
    const lang = this.getLang()

    if (lang === 'json') {
      try {
        const value = JSON.stringify(JSON.parse(this.editorView.state.doc.toString()), null, 2)
        this.editorView.dispatch({
          changes: {from: 0, to: this.editorView.state.doc.length, insert: value}
        })
        this.prettifyBtn.textContent = ''
      } catch (err) {
        this.editorView.dispatch(setDiagnostics(this.editorView.state, [{
          from: 0,
          to: this.editorView.state.doc.length,
          severity: 'error',
          message: err.message,
        }]))
        this.prettifyBtn.textContent = '🚨'
      }

      return
    }

    const [parser, plugin] =
      lang === 'javascript' ? ['babel', parserBabel] :
      lang === 'css' ? ['css', parserCss] :
      lang === 'markdown' ? ['markdown', parserMarkdown] :
      lang === 'html' ? ['html', parserHtml] :
      lang === 'less' ? ['less', parserCss] :
      lang === 'scss' ? ['scss', parserCss] :
      lang === 'yaml' ? ['yaml', parserYaml] :
      lang === 'typescript' ? ['babel', parserBabel] :
      undefined
    if (!parser) return
    try {
      const value = prettier.format(this.editorView.state.doc.toString(), {
        parser,
        plugins: [plugin],
        semi: false,
        singleQuote: true,
        trailingComma: 'all',
        bracketSpacing: false,
      })

      this.editorView.dispatch({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: value.substring(0, value.lastIndexOf('\n')),
        }
      })
      this.prettifyBtn.textContent = ''
    } catch (err) {
      this.prettifyBtn.textContent = '🚨'
      if (!err.loc?.start?.line) return
      const line = this.editorView.state.doc.line(err.loc.start.line)
      const lines = err.message.split('\n')
      const diagnostics = lines.map((message) => ({
        from: line.from + err.loc.start.column - 1,
        to: line.from + err.loc.start.column - 1,
        severity: 'error',
        message: message,
      }))

      this.editorView.dispatch(setDiagnostics(this.editorView.state, diagnostics))
    }
  }

  getLang() {
    return this.node.attrs.params.lang ?? ''
  }
}

function computeChange(oldVal, newVal) {
  if (oldVal == newVal) return null
  let start = 0
  let oldEnd = oldVal.length
  let newEnd = newVal.length

  while (
    start < oldEnd &&
    oldVal.charCodeAt(start) == newVal.charCodeAt(start)
  ) {
    ++start
  }

  while (
    oldEnd > start &&
    newEnd > start &&
    oldVal.charCodeAt(oldEnd - 1) == newVal.charCodeAt(newEnd - 1)
  ) {
    oldEnd--
    newEnd--
  }

  return {
    from: start,
    to: oldEnd,
    text: newVal.slice(start, newEnd),
  }
}

const getTheme = (theme: string): [Extension, any] =>
  theme === 'dracula' ? [dracula, draculaConfig] :
  theme === 'solarized-light' ? [solarizedLight, solarizedLightConfig] :
  theme === 'solarized-dark' ? [solarizedDark, solarizedDarkConfig] :
  theme === 'material-light' ? [materialLight, materialLightConfig] :
  theme === 'material-dark' ? [materialDark, materialDarkConfig] :
  theme === 'github-light' ? [githubLight, githubLightConfig] :
  theme === 'github-dark' ? [githubDark, githubDarkConfig] :
  [materialLight, materialLightConfig]

const getLangExtension = (lang: string) =>
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
  lang === 'bash' ? StreamLanguage.define(shell) :
  lang === 'yaml' ? StreamLanguage.define(yaml) :
  lang === 'go' ? StreamLanguage.define(go) :
  markdown()
