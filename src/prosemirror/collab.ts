import * as Y from 'yjs'
import {DOMOutputSpec} from 'prosemirror-model'
import {ySyncPlugin, yCursorPlugin} from 'y-prosemirror'
import {ProsemirrorMapping} from 'y-prosemirror/dist/src/lib'
import {Ctrl} from '@/services'

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
        color: {default: null}
      },
      inclusive: false,
      toDOM(): DOMOutputSpec {
        return ['ychange', {}]
      }
    }
  }
}

export const createCollabPlugins = (ctrl: Ctrl, type: Y.XmlFragment, mapping: ProsemirrorMapping) => [
  ySyncPlugin(type, {
    mapping,
    permanentUserData: ctrl.collab?.permanentUserData,
    onFirstRender: () => ctrl.collab.setRendered(),
  }),
  ...(ctrl.collab.isSnapshot ? [] : [yCursorPlugin(ctrl.collab.provider!.awareness, {cursorBuilder})]),
]
