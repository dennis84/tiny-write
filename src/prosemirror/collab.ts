import * as Y from 'yjs'
import {DOMOutputSpec} from 'prosemirror-model'
import {ySyncPlugin, yCursorPlugin, yUndoPlugin} from 'y-prosemirror'
import {ProseMirrorExtension} from '@/prosemirror'
import {Ctrl} from '@/services'

const cursorBuilder = (user: any): HTMLElement => {
  const cursor = document.createElement('span')
  cursor.setAttribute('contexteditable', 'false')
  cursor.classList.add('yjs-cursor')
  cursor.style.borderColor = user.background
  return cursor
}

export const schemaSpec = {
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

export const collab = (ctrl: Ctrl, type: Y.XmlFragment): ProseMirrorExtension => ({
  plugins: (prev) => [
    ...prev,
    ySyncPlugin(type, {
      permanentUserData: ctrl.collab?.permanentUserData,
      onFirstRender: () => ctrl.collab.setRendered(),
    }),
    ...(ctrl.collab.isSnapshot ? [] : [yCursorPlugin(ctrl.collab.provider!.awareness, {cursorBuilder})]),
    yUndoPlugin({undoManager: ctrl.collab.undoManager}),
  ]
})
