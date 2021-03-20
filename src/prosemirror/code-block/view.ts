import {Schema} from 'prosemirror-model'
import {EditorView as PmEditorView, Node} from 'prosemirror-view'
import {TextSelection} from 'prosemirror-state'
import {exitCode} from 'prosemirror-commands'
import {Compartment, EditorState} from '@codemirror/state'
import {EditorView, ViewUpdate, keymap} from '@codemirror/view'
import {defaultKeymap, defaultTabBinding} from '@codemirror/commands'
import {tags} from '@codemirror/highlight'
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
import {materialLight} from 'codemirror-themes/theme/material-light'
import {materialDark} from 'codemirror-themes/theme/material-dark'
import {solarizedLight} from 'codemirror-themes/theme/solarized-light'
import {solarizedDark} from 'codemirror-themes/theme/solarized-dark'
import {dracula} from 'codemirror-themes/theme/dracula'
import {githubLight} from 'codemirror-themes/theme/github-light'
import {githubDark} from 'codemirror-themes/theme/github-dark'
import prettier from 'prettier'
import parserBabel from 'prettier/parser-babel'
import parserCss from 'prettier/parser-postcss'
import parserHtml from 'prettier/parser-html'
import parserMarkdown from 'prettier/parser-markdown'
import parserYaml from 'prettier/parser-yaml'
import logos from './logos'
import {CodeBlockProps, cleanLang, defaultProps} from '.'
import {createDragHandle} from '../drag-handle'

export class CodeBlockView {
  node: Node
  view: PmEditorView
  getPos: () => number
  schema: Schema
  dom: Element
  editorView: EditorView
  updating = false
  clicked = false
  options: CodeBlockProps = defaultProps
  logo: HTMLElement
  prettifyBtn: HTMLElement
  dragHandle: HTMLElement
  langExtension: Compartment
  themeExtension: Compartment

  constructor(node, view, getPos, schema, decos, options) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.schema = schema
    this.options = options

    this.logo = createElement('span')
    this.prettifyBtn = createElement('span')
    this.prettifyBtn.className = 'prettify'
    this.prettifyBtn.textContent = '✨'
    this.prettifyBtn.style.display = 'none'
    this.prettifyBtn.setAttribute('title', 'prettify')
    this.prettifyBtn.addEventListener('mousedown', this.prettify.bind(this), true)
    this.updateNav()

    const hasFile = this.node.attrs.params.file !== undefined
    const container = createElement('div')
    container.classList.add('codemirror-container')
    if (hasFile) container.classList.add('has-file')

    const langInput = createElement('span')
    langInput.className = 'lang-input'
    langInput.textContent = this.getLang()
    langInput.setAttribute('contenteditable', '')
    langInput.addEventListener('keydown', (e) => {
      if (e.keyCode === 13) {
        e.preventDefault()
        const lang = cleanLang(langInput.textContent)
        langInput.textContent = lang
        langSelect.style.display = 'none'
        langSelectBottom.style.display = 'none'
        langToggle.style.display = 'block'
        this.prettifyBtn.style.display = 'block'
        const tr = view.state.tr
        tr.setNodeMarkup(getPos(), undefined, {
          ...this.node.attrs,
          params: {...this.node.attrs.params, lang},
        })
        view.dispatch(tr)
        this.reconfigure()
        this.updateNav()
        this.editorView.focus()
      }
    })

    langInput.addEventListener('blur', () => {
      langSelect.style.display = 'none'
      langSelectBottom.style.display = 'none'
      langToggle.style.display = 'block'
    })

    const langSelect = createElement('div')
    langSelect.className = 'lang-select'
    langSelect.textContent = '```'
    langSelect.style.display = 'none'
    langSelect.appendChild(langInput)
    const langSelectBottom = createElement('div')
    langSelectBottom.className = 'lang-select'
    langSelectBottom.textContent = '```'
    langSelectBottom.style.display = 'none'

    const langToggle = createElement('div')
    langToggle.className = 'lang-toggle'
    langToggle.appendChild(this.logo)
    langToggle.addEventListener('click', () => {
      langToggle.style.display = 'none'
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
      run: () => {
        const tr = this.view.state.tr
        let selection
        if (this.getPos() === 0) {
          tr.insert(0, this.schema.node('paragraph'))
          selection = new TextSelection(tr.doc.resolve(this.getPos()))
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
    this.themeExtension = new Compartment

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
        this.themeExtension.of(getTheme(this.options.theme)),
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

    if (hasFile) {
      const theme = getTheme(this.options.theme)
      const fileInfo = createElement('pre')
      fileInfo.classList.add('file-info')
      fileInfo.classList.add(theme[1].match(tags.comment))
      fileInfo.textContent = `// ${this.node.attrs.params.src}`
      const closeFile = createElement('span')
      closeFile.className = 'close-file'
      closeFile.textContent = '❎'
      closeFile.addEventListener('click', this.close.bind(this))
      this.editorView.dom.appendChild(fileInfo)
      this.editorView.dom.appendChild(closeFile)
    }

    container.appendChild(langSelect)
    container.appendChild(this.prettifyBtn)
    container.appendChild(this.editorView.dom)
    container.appendChild(langSelectBottom)
    container.appendChild(langToggle)

    if (decos.find((d) => d.type.attrs.class === 'draggable')) {
      container.appendChild(createDragHandle())
    }

    this.dom = container
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
    if (langChanged) this.reconfigure()
    this.updateNav()

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
        this.themeExtension.reconfigure(getTheme(this.options.theme)),
      ]
    })
  }

  forwardSelection() {
    if (!this.editorView.hasFocus) return
    const offset = this.getPos() + 1
    const anchor = this.editorView.state.selection.main.from + offset
    const head = this.editorView.state.selection.main.to + offset
    const sel = TextSelection.create(this.view.state.doc, anchor, head)
    if (!sel.eq(this.view.state.selection)) {
      this.view.dispatch(this.view.state.tr.setSelection(sel))
    }
  }

  updateListener(update: ViewUpdate) {
    if (this.updating) return

    if (this.clicked) {
      this.clicked = false
      return
    }

    const sel = update.state.selection.main
    if (sel.empty && this.options.typewriterMode) {
      const coords = this.editorView.coordsAtPos(sel.from)
      if (!coords) return
      const elem = document.elementFromPoint(coords.left, coords.top)
      if (!elem) return

      elem.scrollIntoView({
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
            text.length > 0 ? this.schema.text(text.toString()) : null,
          )

          this.view.dispatch(t)
        })
      }
    }
  }

  updateNav() {
    const lang = this.getLang()
    let elem
    if (logos[lang]) {
      elem = createElement('img')
      elem.src = logos[lang]
      elem.width = this.options.fontSize
      elem.height = this.options.fontSize
      elem.style.marginTop = `${this.options.fontSize as number / 4}px`
      elem.setAttribute('title', lang)
    } else {
      elem = createElement('span')
      elem.textContent = '📜'
      elem.setAttribute('title', lang)
    }

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

    this.logo.innerHTML = ''
    this.logo.appendChild(elem)
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

const getTheme = (theme: string) =>
  theme === 'dracula' ? dracula :
  theme === 'solarized-light' ? solarizedLight :
  theme === 'solarized-dark' ? solarizedDark :
  theme === 'material-light' ? materialLight :
  theme === 'material-dark' ? materialDark :
  theme === 'github-light' ? githubLight :
  theme === 'github-dark' ? githubDark :
  materialLight

const getLangExtension = (lang: string) =>
  lang === 'javascript' ? javascript() :
  lang === 'typescript' ? javascript({typescript: true}) :
  lang === 'java' ? java() :
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

const createElement = (name: string) => {
  const el = document.createElement(name)
  el.setAttribute('contenteditable', 'false')
  return el
}
