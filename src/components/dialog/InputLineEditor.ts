import {EditorView, crosshairCursor, drawSelection, keymap} from '@codemirror/view'
import {Extension} from '@codemirror/state'
import {standardKeymap} from '@codemirror/commands'
import {acceptCompletion, autocompletion, moveCompletionSelection} from '@codemirror/autocomplete'

interface Props {
  doc: string
  parent: Element
  theme: Extension
  words?: string[]
  onClose: () => void
  onEnter: (lang: string) => void
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
        drawSelection(),
        crosshairCursor(),
        autocompletion({
          defaultKeymap: false,
          override: [
            () => ({
              options: props.words?.map((label) => ({label, type: 'word'})) ?? [],
              //Object.keys(languages).map((label) => ({label, type: 'word'})),
              from: 0,
            }),
          ],
        }),
        EditorView.domEventHandlers({
          blur: () => {
            this.reset()
            this.props.onClose()
            return true
          },
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
          },
          {
            key: 'Escape',
            run: () => {
              this.reset()
              this.props.onClose()
              return true
            },
          },
          ...standardKeymap,
        ]),
      ],
    })
  }

  destroy() {
    this.view.destroy()
  }

  focus() {
    this.view.focus()
    this.view.dispatch({
      selection: {anchor: 0, head: this.view.state.doc.length},
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
      },
    })
  }
}
