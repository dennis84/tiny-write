import type * as Y from 'yjs'
import type {Awareness} from 'y-protocols/awareness'
import type {ProsemirrorMapping} from 'y-prosemirror/dist/src/lib'
import type {DOMOutputSpec} from 'prosemirror-model'
import {ySyncPlugin, yCursorPlugin} from 'y-prosemirror'

const cursorBuilder = (user: any): HTMLElement => {
  const cursor = document.createElement('span')
  cursor.setAttribute('contexteditable', 'false')
  cursor.classList.add('yjs-cursor')
  cursor.style.borderColor = user.background
  return cursor
}

export const collabSchemaSpec = {
  marks: {
    ychange: {
      attrs: {
        user: {default: null},
        type: {default: null},
        color: {default: null},
      },
      inclusive: false,
      toDOM(): DOMOutputSpec {
        return ['ychange', {}]
      },
    },
  },
}

export const createCollabPlugins = (
  type: Y.XmlFragment,
  permanentUserData: Y.PermanentUserData,
  awareness: Awareness,
  mapping: ProsemirrorMapping,
  isSnapshot: boolean,
) => [
  ySyncPlugin(type, {
    mapping,
    permanentUserData,
  }),
  ...(isSnapshot ? [] : [yCursorPlugin(awareness, {cursorBuilder})]),
]
