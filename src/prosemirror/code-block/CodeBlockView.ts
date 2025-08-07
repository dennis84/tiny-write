import type {Node} from 'prosemirror-model'
import {
  DecorationSet,
  type DecorationSource,
  type EditorView as ProsemirrorEditorView,
} from 'prosemirror-view'
import {Selection, TextSelection} from 'prosemirror-state'
import {exitCode} from 'prosemirror-commands'
import type {Compartment} from '@codemirror/state'
import {EditorView, type ViewUpdate, keymap} from '@codemirror/view'
import {autocompletion} from '@codemirror/autocomplete'
import type {ConfigService} from '@/services/ConfigService'
import type {CodeMirrorService} from '@/services/CodeMirrorService'
import {getLanguageConfig} from '@/codemirror/highlight'
import {findWords} from '@/codemirror/completion'
import {mermaidKeywords} from '@/codemirror/mermaid'
import {foldAll} from '@/codemirror/fold-all'
import {copilot} from '@/codemirror/copilot'
import {onEnterDoubleNewline} from '@/codemirror/key-bindings'
import {clipPlugin} from '@/codemirror/clip'
import {isTauri} from '@/env'
import {createMermaidPlugin} from './mermaid-preview'

export class CodeBlockView {
  public dom: HTMLElement
  private editorView: EditorView
  private compartments: Record<string, Compartment>
  private updating = false
  private clicked = false

  constructor(
    private node: Node,
    private view: ProsemirrorEditorView,
    readonly getPos: () => number | undefined,
    private innerDecos: DecorationSource,
    readonly configService: ConfigService,
    private codeMirrorService: CodeMirrorService,
  ) {
    this.dom = document.createElement('div')
    this.dom.setAttribute('contenteditable', 'false')
    this.dom.classList.add('cm-container')

    this.dom.addEventListener('cm:user_event', async (event: any) => {
      const action = event.detail.userEvent
      if (action === 'prettify') {
        await codeMirrorService.format(this.editorView, this.lang, this.configService.prettier)
      } else if (action === 'fold_all') {
        foldAll(this.editorView)
      }
    })

    const embeddedCodeMirrorKeymap = keymap.of([
      {
        key: 'Backspace',
        run: () => {
          if (!this.editorView.state.doc.length) {
            const offset = this.getPos()
            if (offset === undefined) return false
            const tr = this.view.state.tr.deleteRange(
              Math.max(0, offset - 1),
              offset + this.node.content.size + 1,
            )
            this.view.dispatch(tr)
            this.view.focus()
            return true
          }

          return false
        },
      },
      onEnterDoubleNewline(() => {
        if (exitCode(this.view.state, this.view.dispatch)) {
          this.view.focus()
          return true
        }
      }),
      {
        key: 'Ctrl-Enter',
        run: () => {
          if (!exitCode(this.view.state, this.view.dispatch)) return false
          this.view.focus()
          return true
        },
      },
      {
        key: 'ArrowUp',
        run: (editorView) => {
          const state = editorView.state
          const selection = state.selection
          const startPos = selection.main.head
          if (!selection.main.empty) return false
          const line = editorView.state.doc.lineAt(startPos)

          if (line.number === 1) {
            let tr = this.view.state.tr
            const nodePos = this.getPos()
            if (nodePos === undefined) return false
            let targetPos = nodePos - 1
            if (nodePos === 0) {
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
        },
      },
      {
        key: 'ArrowDown',
        run: (editorView) => {
          const state = editorView.state
          const selection = state.selection
          const startPos = selection.main.head
          if (!selection.main.empty) return false
          const line = editorView.state.doc.lineAt(startPos)

          if (line.number === editorView.state.doc.lines) {
            const tr = this.view.state.tr
            const nodePos = this.getPos()
            if (nodePos === undefined) return false
            const targetPos = nodePos + editorView.state.doc.length + 2
            const selection = Selection.near(tr.doc.resolve(targetPos))

            tr.setSelection(selection).scrollIntoView()
            this.view.dispatch(tr)
            this.view.focus()
            return true
          }

          return false
        },
      },
    ])

    const editor = this.codeMirrorService.createEditor({
      lang: this.lang,
      doc: this.node.textContent,
      extensions: [
        embeddedCodeMirrorKeymap,
        clipPlugin,
        createMermaidPlugin(this),
        EditorView.updateListener.of((update) => this.forwardUpdate(update)),
        autocompletion(),
        ...(isTauri()
          ? [
              copilot({
                configure: () => {
                  const {tabWidth, useTabs} = this.configService.prettier
                  const path = `buffer://editor-${getPos()}-${this.lang}`
                  return {path, language: this.lang, tabWidth, useTabs}
                },
              }),
            ]
          : []),
        EditorView.domEventHandlers({
          mousedown: () => {
            this.clicked = true
          },
        }),
      ],
    })

    this.editorView = editor.editorView
    this.compartments = editor.compartments
    this.dom.appendChild(editor.editorView.dom)

    if (this.innerDecos instanceof DecorationSet) {
      this.innerDecos.find().map((d: any) => {
        const elem = typeof d.type.toDOM === 'function' ? d.type.toDOM(view, getPos) : d.type.toDOM
        this.dom.appendChild(elem)
      })
    }

    this.update(node)
  }

  get lang(): string {
    return this.node.attrs.lang ?? ''
  }

  forwardUpdate(update: ViewUpdate) {
    if (this.updating || !this.editorView.hasFocus) return

    const nodePos = this.getPos()
    if (nodePos === undefined) return

    let offset = nodePos + 1
    const {main} = update.state.selection
    const selFrom = offset + main.from
    const selTo = offset + main.to
    const pmSel = this.view.state.selection

    if (update.docChanged || pmSel.from !== selFrom || pmSel.to !== selTo) {
      const tr = this.view.state.tr
      update.changes.iterChanges((fromA, toA, fromB, toB, text) => {
        if (text.length) {
          tr.replaceWith(offset + fromA, offset + toA, this.view.state.schema.text(text.toString()))
        } else {
          tr.delete(offset + fromA, offset + toA)
        }
        offset += toB - fromB - (toA - fromA)
      })
      tr.setSelection(TextSelection.create(tr.doc, selFrom, selTo))
      this.view.dispatch(tr)
    }

    if (this.clicked) {
      this.clicked = false
      return
    }

    const sel = update.state.selection.main
    if (
      this.editorView.hasFocus &&
      sel.empty &&
      (update.docChanged || update.selectionSet) &&
      this.configService.typewriterMode
    ) {
      const lineBlock = this.editorView.lineBlockAt(sel.from)
      let {node} = this.editorView.domAtPos(lineBlock.from)
      if (!node) return
      if (node.nodeType === 3) node = node.parentNode as Element
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
    if (node.type !== this.node.type) return false
    const lang = this.lang
    this.node = node
    if (this.updating) return true

    if (node.attrs.hidden) {
      this.dom.classList.add('hidden')
    } else {
      this.dom.classList.remove('hidden')
    }

    if (node.attrs.lang !== lang) {
      this.reconfigure()
    }

    const newText = node.textContent
    const curText = this.editorView.state.doc.toString()

    if (newText !== curText) {
      let start = 0
      let curEnd = curText.length
      let newEnd = newText.length
      while (start < curEnd && curText.charCodeAt(start) === newText.charCodeAt(start)) {
        ++start
      }

      while (
        curEnd > start &&
        newEnd > start &&
        curText.charCodeAt(curEnd - 1) === newText.charCodeAt(newEnd - 1)
      ) {
        curEnd--
        newEnd--
      }

      this.updating = true
      this.editorView.dispatch({
        changes: {
          from: start,
          to: curEnd,
          insert: newText.slice(start, newEnd),
        },
      })

      this.updating = false
    }

    return true
  }

  reconfigure() {
    const lang = getLanguageConfig(this.lang)
    const langSupport = lang.highlight()
    const effects = [
      this.compartments.lang.reconfigure(langSupport),
      this.compartments.findWords.reconfigure(
        langSupport.language.data.of({autocomplete: findWords}),
      ),
    ]

    if (this.lang === 'mermaid') {
      effects.push(
        this.compartments.keywords.reconfigure(
          langSupport.language.data.of({autocomplete: mermaidKeywords}),
        ),
      )
    }

    this.editorView.dispatch({effects})
  }

  destroy() {
    this.editorView.destroy()
  }

  stopEvent(e: Event) {
    if ((e.target as HTMLElement).classList.contains('block-handle')) {
      return false
    }

    return true
  }
}
