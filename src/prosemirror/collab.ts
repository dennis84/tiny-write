import * as Y from 'yjs'
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

const ychangeSchema = {
  ychange: {
    attrs: {
      user: {default: null},
      type: {default: null},
      color: {default: null}
    },
    inclusive: false,
    parseDOM: [{tag: 'ychange'}],
    toDOM: () => ['ychange', {}]
  }
}

export const collab = (ctrl: Ctrl, type: Y.XmlFragment): ProseMirrorExtension => ({
  schema: (prev) => ({
    ...prev,
    marks: (prev.marks as any).append(ychangeSchema),
  }),
  plugins: (prev) => [
    ...prev,
    ySyncPlugin(type, {
      permanentUserData: ctrl.collab?.permanentUserData,
      onFirstRender: () => ctrl.collab.setRendered(),
    }),
    yCursorPlugin(ctrl.collab.provider!.awareness, {cursorBuilder}),
    yUndoPlugin({undoManager: ctrl.collab.undoManager}),
  ]
})
