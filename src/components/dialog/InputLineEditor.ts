import {acceptCompletion, autocompletion, moveCompletionSelection} from '@codemirror/autocomplete'
import {standardKeymap} from '@codemirror/commands'
import type {Extension} from '@codemirror/state'
import {crosshairCursor, drawSelection, EditorView, keymap, placeholder} from '@codemirror/view'

interface Props {
  doc: string
  parent: Element
  theme: Extension
  words?: string[]
  placeholder?: string
  onEnter: (value: string) => void
}

export class InputLineEditor {
  private view: EditorView

  constructor(private props: Props) {
    this.view = new EditorView({
      doc: this.props.doc,
      parent: this.props.parent,
      extensions: [
        props.theme,
        placeholder(props.placeholder ?? ''),
        drawSelection(),
        crosshairCursor(),
        autocompletion({
          defaultKeymap: false,
          override: [
            () => ({
              options: props.words?.map((label) => ({label, type: 'word'})) ?? [],
              from: 0,
            }),
          ],
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
              const value = editorView.state.doc.toString().trim()
              this.props.onEnter(value)
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
}
