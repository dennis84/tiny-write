import {Node} from 'prosemirror-model'
import {DecorationSet, DecorationSource, EditorView as ProsemirrorEditorView} from 'prosemirror-view'
import {TextSelection, Selection} from 'prosemirror-state'
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
import {completion, tabCompletionKeymap} from './completion'
import {highlight, changeLang} from './lang'
import {getTheme} from './theme'
import expand from './expand'
import prettify from './prettify'
import mermaid from './mermaid'

export class CodeBlockView {
  dom: Element
  outer: HTMLDivElement
  inner: HTMLDivElement
  editorView: EditorView
  updating = false
  clicked = false
  dragHandle: HTMLElement
  langExtension: Compartment

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

    const [theme, themeConfig] = getTheme(this.options.theme)
    this.inner.style.background = themeConfig.background

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
        autocompletion({override: completion}),
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
        this.langExtension.of(highlight(this.getLang())),
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

    this.inner.appendChild(this.editorView.dom)

    if (this.innerDecos instanceof DecorationSet) {
      this.innerDecos.find().map((d: any) => {
        const elem = typeof d.type.toDOM === 'function' ? d.type.toDOM() : d.type.toDOM
        this.outer.appendChild(elem)
      })
    }

    this.dom = this.outer
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

  ignoreMutation() {
    return true
  }

  update(node: Node) {
    if (node.type != this.node.type) return false
    const lang = this.getLang()
    this.node = node
    // Allow update from collab
    if (node.attrs.params.lang !== lang) {
      this.reconfigure()
    }

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
        this.langExtension.reconfigure(highlight(this.getLang())),
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

  getLang() {
    return this.node.attrs.params.lang ?? ''
  }

  getOptions() {
    return this.options;
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
