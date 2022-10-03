import {Node} from 'prosemirror-model'
import {DecorationSet, DecorationSource, EditorView as ProsemirrorEditorView} from 'prosemirror-view'
import {Selection} from 'prosemirror-state'
import {exitCode} from 'prosemirror-commands'
import {Compartment, EditorState, Text} from '@codemirror/state'
import {EditorView, ViewUpdate, keymap} from '@codemirror/view'
import {defaultKeymap, indentWithTab} from '@codemirror/commands'
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete'
import {indentOnInput, bracketMatching, foldGutter, foldKeymap} from '@codemirror/language'
import {linter} from '@codemirror/lint'
import {CodeBlockProps, defaultProps} from '.'
import {findWords, tabCompletionKeymap} from './completion'
import {highlight, changeLang} from './lang'
import {getTheme} from './theme'
import expand from './expand'
import prettify from './prettify'
import mermaid from './mermaid'

export class CodeBlockView {
  dom: HTMLElement
  outer: HTMLDivElement
  inner: HTMLDivElement
  editorView: EditorView
  updating = false
  clicked = false
  langExtension: Compartment
  langCompletionExtension: Compartment

  constructor(
    private node: Node,
    private view: ProsemirrorEditorView,
    private getPos: () => number,
    private innerDecos: DecorationSource,
    private options: CodeBlockProps = defaultProps,
  ) {
    this.outer = document.createElement('div')
    this.outer.setAttribute('contenteditable', 'false')
    this.outer.classList.add('codemirror-outer')
    this.inner = document.createElement('div')
    this.inner.classList.add('codemirror-inner')
    this.outer.appendChild(this.inner)

    const codeMirrorKeymap = keymap.of([{
      key: 'Backspace',
      run: () => {
        if (!this.editorView.state.doc.length) {
          const offset = this.getPos()
          const tr = this.view.state.tr.deleteRange(
            Math.max(0, offset - 1),
            offset + this.node.content.size + 1
          )
          this.view.dispatch(tr)
          this.view.focus()
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
          let tr = this.view.state.tr
          let targetPos = this.getPos() - 1
          if (this.getPos() === 0) {
            tr.insert(0, this.view.state.schema.node('paragraph'))
            targetPos = 0
          }

          this.view.dispatch(tr)
          tr = this.view.state.tr
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
    this.langCompletionExtension = new Compartment

    const [theme, themeConfig] = getTheme(this.options.theme)
    this.inner.style.background = themeConfig.background
    const langSupport = highlight(this.getLang())

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
          indentWithTab,
        ]),
        theme,
        indentOnInput(),
        bracketMatching(),
        foldGutter(),
        closeBrackets(),
        linter(() => []),
        EditorState.tabSize.of(2),
        expand(this),
        prettify(this),
        mermaid(this),
        changeLang(this, {
          onClose: () => this.editorView.focus(),
          onChange: (lang: string) => {
            const tr = this.view.state.tr
            tr.setNodeMarkup(this.getPos(), undefined, {
              ...this.node.attrs,
              params: {...this.node.attrs.params, lang},
            })
            this.view.dispatch(tr)
            this.reconfigure()
            this.editorView.focus()
          }
        }),
        this.langExtension.of(langSupport),
        EditorView.updateListener.of((update) => this.forwardUpdate(update)),
        this.langCompletionExtension.of(langSupport.language.data.of({autocomplete: findWords})),
        autocompletion(),
        EditorView.lineWrapping,
        EditorView.domEventHandlers({
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

    this.inner.appendChild(this.editorView.dom)

    if (this.innerDecos instanceof DecorationSet) {
      this.innerDecos.find().map((d: any) => {
        const elem = typeof d.type.toDOM === 'function' ? d.type.toDOM() : d.type.toDOM
        this.outer.appendChild(elem)
      })
    }

    this.dom = this.outer
  }

  forwardUpdate(update: ViewUpdate) {
    if (this.updating || !this.editorView.hasFocus) return

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

  setSelection(anchor: number, head: number) {
    this.editorView.focus()
    this.updating = true
    this.editorView.dispatch({selection: {anchor, head}})
    this.updating = false
  }

  update(node: Node) {
    if (node.type != this.node.type) return false
    const lang = this.getLang()
    this.node = node
    if (this.updating) return true

    if (node.attrs.params.lang !== lang) {
      this.reconfigure()
    }

    const newText = node.textContent
    const curText = this.editorView.state.doc.toString()

    if (newText != curText) {
      let start = 0
      let curEnd = curText.length
      let newEnd = newText.length
      while (
        start < curEnd &&
        curText.charCodeAt(start) == newText.charCodeAt(start)
      ) {
        ++start
      }

      while (
        curEnd > start &&
        newEnd > start &&
        curText.charCodeAt(curEnd - 1) == newText.charCodeAt(newEnd - 1)
      ) {
        curEnd--
        newEnd--
      }

      this.updating = true
      this.editorView.dispatch({
        changes: {
          from: start,
          to: curEnd,
          insert: newText.slice(start, newEnd)
        }
      })

      this.updating = false
    }

    return true
  }

  reconfigure() {
    const langSupport = highlight(this.getLang())
    this.editorView.dispatch({
      effects: [
        this.langExtension.reconfigure(langSupport),
        this.langCompletionExtension.reconfigure(
          langSupport.language.data.of({autocomplete: findWords})
        ),
      ]
    })
  }

  destroy() {
    this.editorView.destroy()
  }

  selectNode() {
    this.editorView.focus()
  }

  stopEvent() {
    return true
  }

  getLang() {
    return this.node.attrs.params.lang ?? ''
  }

  getOptions() {
    return this.options;
  }
}
