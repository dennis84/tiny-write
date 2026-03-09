import {Compartment, type EditorState} from '@codemirror/state'
import {EditorView, ViewPlugin, type ViewUpdate} from '@codemirror/view'

const classCompartment = new Compartment()

const getEditorClass = (state: EditorState, hasFocus: boolean, lines: number) => {
  const hasMany = state.doc.lines > lines
  const shouldShow = hasMany && !hasFocus
  return shouldShow ? 'is-clipped' : ''
}

const updateClass = (view: EditorView, hasFocus: boolean, lines: number) => {
  const newClass = getEditorClass(view.state, hasFocus, lines)
  view.dispatch({
    effects: classCompartment.reconfigure(EditorView.editorAttributes.of({class: newClass})),
  })
}

const lineCountViewPlugin = (lines: number) => ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      queueMicrotask(() => updateClass(view, view.hasFocus, lines))
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        queueMicrotask(() => updateClass(update.view, update.view.hasFocus, lines))
      }
    }
  },
  {
    eventHandlers: {
      focus(_event, view) {
        updateClass(view, true, lines)
      },
      blur(event, view) {
        // The target receiving focus when the editor is blurred.
        const target = event.relatedTarget as Element
        // If is a child of the editor, do nothing.
        if (view.dom.contains(target)) {
          return
        }

        updateClass(view, false, lines)
      },
    },
  },
)

export const clipPlugin = (lines = 10) => [
  classCompartment.of(EditorView.editorAttributes.of({class: ''})),
  lineCountViewPlugin(lines),
]
