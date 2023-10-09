import {schema} from 'prosemirror-markdown'
import * as Y from 'yjs'
import {prosemirrorJSONToYDoc} from 'y-prosemirror'
import {Ctrl} from '@/services'

export const createText = (text: string) => ({
  doc: {
    type: 'doc',
    content: [{type: 'paragraph', content: [{type: 'text', text}]}]
  },
})

export const createYUpdate = (id: string, str: string) => {
  const ydoc = createYdoc(id, str)
  return Y.encodeStateAsUpdate(ydoc)
}

export const createYdoc = (id: string, str: string) => {
  const doc = str ? createText(str).doc : {type: 'doc', content: []}
  return prosemirrorJSONToYDoc(schema, doc, id)
}

export const insertText = (ctrl: Ctrl, text: string) => {
  const currentFile = ctrl.file.currentFile
  const tr = currentFile?.editorView?.state.tr
  tr!.insertText(text)
  currentFile?.editorView?.dispatch(tr!)
}

export const getText = (ctrl: Ctrl) =>
  ctrl.file.currentFile?.editorView?.state.doc.textContent

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

export const pause = (ms: number) =>
  new Promise((resolve) => setTimeout(() => resolve(1), ms))
