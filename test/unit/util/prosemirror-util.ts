import {EditorState} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {prosemirrorJSONToYDoc} from 'y-prosemirror'
import * as Y from 'yjs'
import {schema} from '@/services/ProseMirrorService'

export const createEditorView = (texts: string[]) => {
  const node = document.createElement('div')
  const selection = {type: 'text', anchor: 1, head: 1}
  return new EditorView(node, {
    state: EditorState.fromJSON({schema}, {...createText(texts), selection}),
  })
}

export const createText = (texts: string[]) => ({
  doc: {
    type: 'doc',
    content: texts.map((text) => ({type: 'paragraph', content: [{type: 'text', text}]})),
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
