import {Plugin} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {ySyncPlugin, yCursorPlugin, yUndoPlugin, ySyncPluginKey} from 'y-prosemirror'
import {Awareness} from 'y-protocols/awareness'
import {ProseMirrorExtension} from '../state'
import {YOptions} from '../../state'

const cursorBuilder = (user: any): HTMLElement => {
  const cursor = document.createElement('span')
  cursor.setAttribute('contexteditable', 'false')
  cursor.classList.add('ProseMirror-yjs-cursor')
  cursor.style.borderColor = user.background
  return cursor
}

class MouseCursorView {
  view: EditorView
  awareness: Awareness
  container: HTMLElement
  cursors: Map<number, HTMLElement> = new Map()

  constructor(view, awareness) {
    this.view = view
    this.awareness = awareness
    this.container = document.createElement('div')

    if (!view.dom.offsetParent) return
    view.dom.offsetParent.appendChild(this.container)
    awareness.on('change', this.onAwarenessChange.bind(this))
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
  }

  destroy() {
    document.removeEventListener('mousemove', this.onMouseMove.bind(this))
    this.awareness.off('change', this.onAwarenessChange.bind(this))
    this.awareness.setLocalStateField('mouse', null)
  }

  onMouseMove(e: MouseEvent) {
    const rect = this.view.dom.getBoundingClientRect()
    const x = e.x - rect.left
    const y = e.y - rect.top
    this.awareness.setLocalStateField('mouse', {x, y})
  }

  onAwarenessChange({added, updated, removed}) {
    const ystate = ySyncPluginKey.getState(this.view.state)
    const y = ystate.doc
    const rect = this.view.dom.getBoundingClientRect()

    removed.forEach((id) => {
      const elem = this.cursors.get(id)
      if (!elem || !this.container) return
      this.container.removeChild(elem)
      this.cursors.delete(id)
    })

    added.concat(updated).forEach((id) => {
      const aw = this.awareness.states.get(id)
      if (id === y.clientID || !aw.mouse) return
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
}

const yMouseCursorPlugin = (awareness: Awareness) => new Plugin({
  view(editorView) {
    return new MouseCursorView(editorView, awareness)
  },
})

export default (y?: YOptions): ProseMirrorExtension => ({
  plugins: (prev) => y ? [
    ...prev,
    ySyncPlugin(y.prosemirrorType),
    // @ts-ignore
    yCursorPlugin(y.provider.awareness, {cursorBuilder}),
    yMouseCursorPlugin(y.provider.awareness),
    yUndoPlugin(),
  ] : prev
})
