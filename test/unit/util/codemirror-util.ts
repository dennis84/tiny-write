import * as Y from 'yjs'

export const createYUpdate = (id: string, str: string) => {
  const ydoc = createYdoc(id, str)
  return Y.encodeStateAsUpdate(ydoc)
}

export const createYdoc = (id: string, doc: string) => {
  const ydoc = new Y.Doc({gc: false})
  ydoc.getText(id).insert(0, doc)
  return ydoc
}
