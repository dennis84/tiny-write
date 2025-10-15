import {Compartment, type EditorState} from '@codemirror/state'
import {EditorView, ViewPlugin, type ViewUpdate} from '@codemirror/view'

const classCompartment = new Compartment()

const getEditorClass = (state: EditorState, hasFocus: boolean) => {
  const hasMany = state.doc.lines > 10
  const shouldShow = hasMany && !hasFocus
  return shouldShow ? 'is-clipped' : ''
}

const updateClass = (view: EditorView, hasFocus: boolean) => {
  const newClass = getEditorClass(view.state, hasFocus)
  view.dispatch({
    effects: classCompartment.reconfigure(EditorView.editorAttributes.of({class: newClass})),
  })
}

const lineCountViewPlugin = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      queueMicrotask(() => updateClass(view, view.hasFocus))
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        queueMicrotask(() => updateClass(update.view, update.view.hasFocus))
      }
    }
  },
  {
    eventHandlers: {
      focus(_event, view) {
        updateClass(view, true)
      },
      blur(event, view) {
        // The target receiving focus when the editor is blurred.
        const target = event.relatedTarget as Element
        // If is a child of the editor, do nothing.
        if (view.dom.contains(target)) {
          return
        }

        updateClass(view, false)
      },
    },
  },
)

export const clipPlugin = [
  classCompartment.of(EditorView.editorAttributes.of({class: ''})),
  lineCountViewPlugin,
]
