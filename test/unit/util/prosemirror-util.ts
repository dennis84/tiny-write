import {schema} from 'prosemirror-markdown'
import * as Y from 'yjs'
import {prosemirrorJSONToYDoc} from 'y-prosemirror'
import {Ctrl} from '@/services'

export const createText = (texts: string[]) => ({
  doc: {
    type: 'doc',
    content: texts.map((text) => ({type: 'paragraph', content: [{type: 'text', text}]}))
  },
})

export const createYUpdate = (id: string, str: string[]) => {
  const ydoc = createSubdoc(id, str)
  return Y.encodeStateAsUpdate(ydoc)
}

export const createSubdoc = (id: string, str: string[]) => {
  const doc = str ? createText(str).doc : {type: 'doc', content: []}
  return prosemirrorJSONToYDoc(schema, doc, id)
}

export const createYdoc = (subdocs: Y.Doc[]) => {
  const ydoc = new Y.Doc({gc: false})
  subdocs.forEach((subdoc) => ydoc.getMap().set(subdoc.guid, subdoc))
  return ydoc
}

export const insertText = (ctrl: Ctrl, text: string) => {
  const currentFile = ctrl.file.currentFile
  const tr = currentFile?.editorView?.state.tr
  tr!.insertText(text)
  currentFile?.editorView?.dispatch(tr!)
}

export const getText = (ctrl: Ctrl) =>
  ctrl.file.currentFile?.editorView?.state.doc.textContent
