import {EditorView, keymap} from '@codemirror/view'
import {EditorState} from '@codemirror/state'
import {standardKeymap} from '@codemirror/commands'
import {cleanLang} from '.'

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
