import {Plugin} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import * as Y from 'yjs'
import {ySyncPlugin, yCursorPlugin, yUndoPlugin, ySyncPluginKey} from 'y-prosemirror'
import {Awareness} from 'y-protocols/awareness'
import {ProseMirrorExtension} from '@/prosemirror'
import {Ctrl} from '@/services'

const cursorBuilder = (user: any): HTMLElement => {
  const cursor = document.createElement('span')
  cursor.setAttribute('contexteditable', 'false')
  cursor.classList.add('yjs-cursor')
  cursor.style.borderColor = user.background
  return cursor
}

class MouseCursorView {
  container: HTMLElement
  cursors: Map<number, HTMLElement> = new Map()

  constructor(private view: EditorView, private awareness: Awareness) {
    this.container = document.createElement('div')
    this.container.classList.add('mouse-cursor-container')
    if (!this.view.dom.offsetParent) return
    this.view.dom.offsetParent.appendChild(this.container)
    this.awareness.on('change', this.onAwarenessChange)
    document.addEventListener('mousemove', this.onMouseMove)
  }

  destroy() {
    document.removeEventListener('mousemove', this.onMouseMove)
    this.awareness.off('change', this.onAwarenessChange)
    this.awareness.setLocalStateField('mouse', null)
    this.container.remove()
  }

  private onAwarenessChange = ({added, updated, removed}: any) => {
    const ystate = ySyncPluginKey.getState(this.view.state)
    if (!ystate) return

    const y = ystate.doc
    const rect = this.view.dom.getBoundingClientRect()

    removed.forEach((id: number) => {
      const elem = this.cursors.get(id)
      elem?.remove()
      this.cursors.delete(id)
    })

    added.concat(updated).forEach((id: number) => {
      const aw = this.awareness.states.get(id)
      if (id === y.clientID || !aw?.mouse) return
      const mouse = this.cursors.get(id)
      if (mouse) {
        mouse.style.top = `${aw.mouse.y + rect.top}px`
        mouse.style.left = `${aw.mouse.x + rect.left}px`
      } else {
        const cur = document.createElement('span')
        cur.setAttribute('contexteditable', 'false')
        cur.style.setProperty('--user-background', aw.user.background)
        cur.classList.add('mouse-cursor')
        cur.style.top = `${aw.mouse.y + rect.top}px`
        cur.style.left = `${aw.mouse.x + rect.left}px`

        const username = document.createElement('span')
        username.style.backgroundColor = aw.user.background
        username.style.color = aw.user.foreground
        username.textContent = aw.user.name
        cur.append(username)
        this.container.appendChild(cur)
        this.cursors.set(id, cur)
      }
    })
  }

  private onMouseMove = (e: MouseEvent) => {
    if (this.awareness.states.size <= 1) return
    const rect = this.view.dom.getBoundingClientRect()
    const x = e.x - rect.left
    const y = e.y - rect.top
    this.awareness.setLocalStateField('mouse', {x, y})
  }
}

const yMouseCursorPlugin = (awareness: Awareness) => new Plugin({
  view(editorView) {
    return new MouseCursorView(editorView, awareness)
  },
})

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
    yMouseCursorPlugin(ctrl.collab.provider!.awareness),
    yUndoPlugin(),
  ]
})
