import {Schema} from 'prosemirror-model'
import {EditorView as PmEditorView, Node} from 'prosemirror-view'
import {TextSelection} from 'prosemirror-state'
import {exitCode} from 'prosemirror-commands'

import {EditorState, tagExtension} from '@codemirror/state'
import {EditorView, ViewUpdate, keymap} from '@codemirror/view'
import {defaultKeymap, defaultTabBinding} from '@codemirror/commands'
import {javascript} from '@codemirror/lang-javascript'
import {StreamLanguage} from '@codemirror/stream-parser'
import {go} from '@codemirror/legacy-modes/mode/go'
import {
  solarizedLight,
  solarizedDark,
  dracula,
  materialLight,
  materialDark,
  githubLight,
  githubDark,
} from 'codemirror-themes'

interface CodeBlockOptions {
  theme?: string;
}

export class CodeBlockView {
  node: Node
  view: PmEditorView
  getPos: () => number
  schema: Schema
  dom: Element
  editorView: EditorView
  updating = false
  options: CodeBlockOptions = {}

  constructor(node, view, getPos, schema, decos) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.schema = schema
    this.updateOptions(decos)

    const startState = EditorState.create({
      doc: this.node.textContent,
      extensions: this.createExtensions(),
    })

    this.editorView = new EditorView({
      state: startState,
      parent: null,
    })

    const container = document.createElement('div')
    container.className = 'codemirror-container'
    container.appendChild(this.editorView.dom)
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
    return true
  }

  ignoreMutation() {
    return true
  }

  update(node, decos) {
    if (node.type != this.node.type) return false
    this.node = node
    const updated = this.updateOptions(decos)
    if (updated) this.reconfigure()

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

  createExtensions() {
    const langExtension = getLangExtension(this.getLang())
    const codeMirrorKeymap = keymap.of([{
      key: 'Backspace',
      run: () => {
        const offset = this.getPos()
        const tr = this.view.state.tr.deleteRange(Math.max(0, offset - 1), offset + 1)
        this.view.dispatch(tr)
        this.view.focus()
        return true
      }
    }, {
      key: 'Ctrl-Enter',
      run: () => {
        if (exitCode(this.view.state, this.view.dispatch)) this.view.focus()
        return true
      }
    }])

    return [
      keymap.of(defaultKeymap),
      keymap.of([defaultTabBinding]),
      tagExtension('tabSize', EditorState.tabSize.of(2)),
      codeMirrorKeymap,
      ...(langExtension ? [langExtension] : []),
      getTheme(this.options.theme),
      EditorView.updateListener.of(this.updateListener.bind(this)),
      EditorView.domEventHandlers({
        'focus': () => this.forwardSelection(),
      })
    ]
  }

  reconfigure() {
    this.editorView.dispatch({
      reconfigure: {full: this.createExtensions()}
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
    if (this.updating || !update.docChanged) return

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

  updateOptions(decorations) {
    let updated = false
    if (decorations?.length) {
      decorations.forEach((deco) => {
        for (const key in deco.type.attrs) {
          const value = deco.type.attrs[key]
          if (this.options[key] !== value) {
            this.options[key] = value
            updated = true
          }
        }
      })
    }

    return updated
  }

  getLang() {
    return this.node.attrs.params ?? ''
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
  lang === 'go' ? StreamLanguage.define(go) :
  undefined
