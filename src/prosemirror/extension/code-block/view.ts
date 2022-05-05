import {Node} from 'prosemirror-model'
import {DecorationSet, EditorView as ProsemirrorEditorView} from 'prosemirror-view'
import {TextSelection, Selection} from 'prosemirror-state'
import {exitCode} from 'prosemirror-commands'
import {Compartment, EditorState, Text} from '@codemirror/state'
import {EditorView, ViewUpdate, keymap} from '@codemirror/view'
import {defaultKeymap} from '@codemirror/commands'
import {autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap} from '@codemirror/autocomplete'
import {indentOnInput, bracketMatching, foldGutter, foldKeymap} from '@codemirror/language'
import {linter, setDiagnostics} from '@codemirror/lint'
import prettier from 'prettier'
import parserBabel from 'prettier/parser-babel'
import parserTypescript from 'prettier/parser-typescript'
import parserCss from 'prettier/parser-postcss'
import parserHtml from 'prettier/parser-html'
import parserMarkdown from 'prettier/parser-markdown'
import parserYaml from 'prettier/parser-yaml'
import mermaid from 'mermaid'
import logos from './logos'
import {CodeBlockProps, defaultProps} from '.'
import {completion, tabCompletionKeymap} from './completion'
import {LangInputEditor} from './lang-input'
import {getLangExtension} from './lang'
import {getTheme} from './theme'

export class CodeBlockView {
  node: Node
  view: ProsemirrorEditorView
  getPos: () => number
  dom: Element
  editorView: EditorView
  updating = false
  clicked = false
  options: CodeBlockProps = defaultProps
  langToggle: HTMLElement
  prettifyBtn: HTMLElement
  mermaid: HTMLElement
  dragHandle: HTMLElement
  expand: HTMLElement
  expanded = false
  langExtension: Compartment
  langInputEditor: LangInputEditor

  constructor(
    node: Node,
    view: ProsemirrorEditorView,
    getPos: () => number,
    innerDecos: any,
    options: CodeBlockProps
  ) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.options = options

    this.prettifyBtn = document.createElement('span')
    this.prettifyBtn.className = 'prettify'
    this.prettifyBtn.setAttribute('title', 'prettify')
    this.prettifyBtn.addEventListener('mousedown', this.prettify.bind(this), true)

    this.mermaid = document.createElement('div')
    this.mermaid.className = 'mermaid'
    this.mermaid.id = `mermaid-${getPos()}`

    const outer = document.createElement('div')
    outer.setAttribute('contenteditable', 'false')
    outer.classList.add('codemirror-outer')
    const inner = document.createElement('div')
    inner.classList.add('codemirror-inner')
    outer.appendChild(inner)

    const codeMirrorKeymap = keymap.of([{
      key: 'Backspace',
      run: () => {
        if (!this.editorView.state.doc.length) {
          this.close()
          return true
        }
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
        if (!selection.main.empty) return
        const line = editorView.state.doc.lineAt(startPos)

        if (line.number === 1) {
          const tr = this.view.state.tr
          let targetPos = this.getPos() - 1
          if (this.getPos() === 0) {
            tr.insert(0, this.view.state.schema.node('paragraph'))
            targetPos = 0
          }

          const selection = Selection.near(tr.doc.resolve(targetPos))
          tr.setSelection(selection).scrollIntoView()
          this.view.dispatch(tr)
          this.view.focus()
          return true
        }

        return false
      }
    }, {
      key: 'ArrowDown',
      run: (editorView) => {
        const state = editorView.state
        const selection = state.selection
        const startPos = selection.main.head
        if (!selection.main.empty) return
        const line = editorView.state.doc.lineAt(startPos)

        if (line.number === editorView.state.doc.lines) {
          const tr = this.view.state.tr
          const targetPos = this.getPos() + editorView.state.doc.length + 2
          const selection = Selection.near(tr.doc.resolve(targetPos))

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

    const startState = EditorState.create({
      doc: this.node.textContent,
      extensions: [
        extensions,
        codeMirrorKeymap,
        keymap.of(closeBracketsKeymap),
        keymap.of(foldKeymap),
        keymap.of([
          ...defaultKeymap,
          ...completionKeymap,
          ...tabCompletionKeymap,
        ]),
        theme,
        autocompletion({override: completion}),
        indentOnInput(),
        bracketMatching(),
        foldGutter(),
        closeBrackets(),
        linter(() => []),
        EditorState.tabSize.of(2),
        this.langExtension.of(getLangExtension(this.getLang())),
        EditorView.updateListener.of(this.updateListener.bind(this)),
        EditorView.lineWrapping,
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

    this.langToggle = document.createElement('div')
    this.langToggle.className = 'lang-toggle'
    const langInput = document.createElement('div')
    langInput.className = 'lang-input'
    const langSelect = document.createElement('div')
    langSelect.className = 'lang-select'
    langSelect.textContent = '```'
    langSelect.style.display = 'none'
    langSelect.style.color = themeConfig.foreground
    langSelect.appendChild(langInput)

    this.langInputEditor = new LangInputEditor({
      doc: this.getLang(),
      parent: langInput,
      onClose: () => {
        langSelect.style.display = 'none'
        this.langToggle.style.display = 'flex'
        this.editorView.focus()
      },
      onEnter: (lang) => {
        langSelect.style.display = 'none'
        this.langToggle.style.display = 'flex'
        const tr = this.view.state.tr
        tr.setNodeMarkup(this.getPos(), undefined, {
          ...this.node.attrs,
          params: {...this.node.attrs.params, lang},
        })
        this.view.dispatch(tr)
        this.reconfigure()
        this.updateLangToggle()
        this.updatePrettify()
        this.editorView.focus()
      },
    })

    this.langToggle.addEventListener('click', () => {
      this.langToggle.style.display = 'none'
      langSelect.style.display = 'flex'
      this.prettifyBtn.style.display = 'none'
      this.langInputEditor.focus()
    })

    this.expand = document.createElement('div')
    this.expand.classList.add('expand')
    this.expand.addEventListener('click', () => {
      this.expanded = !this.expanded
      this.updateExpand()
    })

    inner.appendChild(this.expand)
    inner.appendChild(langSelect)
    inner.appendChild(this.prettifyBtn)
    outer.appendChild(this.mermaid)
    inner.appendChild(this.editorView.dom)
    outer.appendChild(this.langToggle)

    if (innerDecos instanceof DecorationSet) {
      innerDecos.find().map((d: any) => {
        const elem = typeof d.type.toDOM === 'function' ? d.type.toDOM() : d.type.toDOM
        outer.appendChild(elem)
      })
    }

    this.updateLangToggle()
    this.updatePrettify()
    this.updateMermaid()
    this.updateExpand()
    this.dom = outer
  }

  destroy() {
    this.editorView.destroy()
  }

  selectNode() {
    this.editorView.focus()
  }

  setSelection(anchor: number, head: number) {
    this.editorView.focus()
    this.updating = true
    this.editorView.dispatch({selection: {anchor, head}})
    this.updating = false
  }

  stopEvent(event: any) {
    return this.langInputEditor.containsElem(event.target)
  }

  ignoreMutation() {
    return true
  }

  update(node: Node) {
    if (node.type != this.node.type) return false
    const lang = this.getLang()
    this.node = node
    this.updatePrettify()
    // Allow update from collab
    if (node.attrs.params.lang !== lang) {
      this.reconfigure()
      this.updateLangToggle()
    }

    const change = computeChange(this.editorView.state.doc.toString(), node.textContent)
    if (change) {
      this.updating = true
      this.editorView.dispatch({
        changes: {from: change.from, to: change.to, insert: change.text}
      })

      this.updating = false
    }

    this.updateMermaid()
    this.updateExpand()
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

    for (const tr of update.transactions) {
      if (!tr.changes.empty) {
        tr.changes.iterChanges((
          fromA: number,
          toA: number,
          _fromB: number,
          _toB: number,
          text: Text
        ) => {
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

    this.forwardSelection()
    const sel = update.state.selection.main
    if (
      this.editorView.hasFocus &&
      sel.empty &&
      update.transactions.length > 0 &&
      this.options.typewriterMode
    ) {
      const lineBlock = this.editorView.lineBlockAt(sel.from)
      const {node} = this.editorView.domAtPos(lineBlock.from)
      ;(node as Element).scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      })
    }
  }

  updateLangToggle() {
    const lang = this.getLang()
    let elem: Element
    if (logos[lang]) {
      const img = document.createElement('img')
      img.src = logos[lang]
      img.width = this.options.fontSize
      img.height = this.options.fontSize
      img.setAttribute('title', lang)
      elem = img
    } else {
      elem = document.createElement('span')
      elem.textContent = lang === 'mermaid' ? '🧜‍♀️' : '📜'
      elem.setAttribute('title', lang)
    }

    this.langToggle.innerHTML = ''
    this.langToggle.appendChild(elem)
  }

  updatePrettify() {
    if (this.editorView?.state.doc.length > 0 && (
      this.getLang() === 'javascript' ||
      this.getLang() === 'typescript' ||
      this.getLang() === 'css' ||
      this.getLang() === 'html' ||
      this.getLang() === 'scss' ||
      this.getLang() === 'less' ||
      this.getLang() === 'markdown' ||
      this.getLang() === 'yaml' ||
      this.getLang() === 'json'
    )) {
      this.prettifyBtn.textContent = '✨'
      this.prettifyBtn.style.display = 'block'
    } else {
      this.prettifyBtn.style.display = 'none'
      this.editorView.dispatch(setDiagnostics(this.editorView.state, []))
    }
  }

  updateMermaid() {
    if (this.getLang() !== 'mermaid') {
      this.mermaid.style.display = 'none'
      return
    }

    const content = this.editorView.state.doc.toString()
    if (!content) {
      this.mermaid.style.display = 'none'
      return
    }

    try {
      this.mermaid.style.display = 'flex'
      mermaid.initialize({
        startOnLoad: false,
        theme: this.options.dark ? 'dark' : 'default',
        fontFamily: this.options.font,
      })
      mermaid.render(`mermaid-graph-${this.getPos()}`, content, (svgCode) => {
        this.mermaid.innerHTML = svgCode
      })
    } catch (err) {
      const error = document.createElement('code')
      error.textContent = err.message
      this.mermaid.innerHTML = ''
      this.mermaid.appendChild(error)
    }
  }

  updateExpand() {
    const lang = this.getLang()
    if (lang !== 'mermaid' && this.editorView.state.doc.lines > 10) {
      if (this.expanded) {
        this.editorView.dom.style.maxHeight = '100%'
        this.expand.textContent = '↑'
      } else {
        const height = 10 * this.options.fontSize * 1.8
        this.editorView.dom.style.maxHeight = height + 'px'
        this.expand.textContent = '↓'
      }

      this.expand.style.display = 'flex'
    } else {
      this.expanded = false
      this.expand.style.display = 'none'
    }
  }

  prettify() {
    const lang = this.getLang()

    const [parser, plugin] =
      lang === 'javascript' ? ['babel', parserBabel] :
      lang === 'css' ? ['css', parserCss] :
      lang === 'markdown' ? ['markdown', parserMarkdown] :
      lang === 'html' ? ['html', parserHtml] :
      lang === 'less' ? ['less', parserCss] :
      lang === 'scss' ? ['scss', parserCss] :
      lang === 'yaml' ? ['yaml', parserYaml] :
      lang === 'json' ? ['json', parserBabel] :
      lang === 'typescript' ? ['typescript', parserTypescript] :
      [undefined, undefined]
    if (!parser) return
    try {
      const value = prettier.format(this.editorView.state.doc.toString(), {
        parser,
        plugins: [plugin],
        trailingComma: 'all',
        bracketSpacing: false,
        ...this.options.prettier,
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
      const diagnostics = lines.map((message: string) => ({
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

function computeChange(oldVal: string, newVal: string) {
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
