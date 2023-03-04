import {schema} from 'prosemirror-markdown'
import * as Y from 'yjs'
import {prosemirrorJSONToYDoc} from 'y-prosemirror'
import {fromUint8Array} from 'js-base64'
import {EditorView} from 'prosemirror-view'

export const createText = (text: string) => ({
  doc: {
    type: 'doc',
    content: [{type: 'paragraph', content: [{type: 'text', text}]}]
  },
})

export const createYdoc = (str: string) => {
  const doc = str ? createText(str).doc : {type: 'doc', content: []}
  const ydoc = prosemirrorJSONToYDoc(schema, doc)
  return fromUint8Array(Y.encodeStateAsUpdate(ydoc))
}

export const insertText = (editorView: EditorView, text: string) => {
  const tr = editorView!.state.tr
  tr.insertText(text)
  editorView?.dispatch(tr)
}

export const waitFor = async (fn: () => unknown, retries = 10): Promise<void> => {
  try {
    fn()
  } catch (error) {
    if (retries === 0) {
      console.error(error)
      throw error
    }

    await new Promise((resolve) => setTimeout(resolve, 10))
    return waitFor(fn, retries - 1)
  }
}
