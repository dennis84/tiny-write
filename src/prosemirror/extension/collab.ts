import {EditorState, Plugin, PluginKey} from 'prosemirror-state'
import {DecorationSet, Decoration} from 'prosemirror-view'
import {ySyncPlugin, yCursorPlugin, yUndoPlugin, ySyncPluginKey} from 'y-prosemirror'
import {Awareness} from 'y-protocols/awareness'
import {ProseMirrorExtension} from '../state'
import {YOptions} from '../../state'

const cursorBuilder = (user: any): HTMLElement => {
  const cursor = document.createElement('span')
  cursor.setAttribute('contexteditable', 'false')
  cursor.classList.add('ProseMirror-yjs-cursor')
  cursor.setAttribute('style', `border-color: ${user.background}`)
  return cursor
}

const createMouseCursor = (user: any, coords: any) => () => {
  const cur = document.createElement('span')
  cur.setAttribute('contexteditable', 'false')
  cur.style.setProperty('--user-background', user.background)
  cur.classList.add('mouse-cursor')
  cur.style.top = `${coords.y}px`
  cur.style.left = `${coords.x}px`

  const username = document.createElement('span')
  username.setAttribute('style', `background-color: ${user.background}; color: ${user.foreground}`)
  username.textContent = user.name
  cur.append(username)
  return cur
}

const createDecorations = (state: EditorState, awareness: Awareness) => {
  const ystate = ySyncPluginKey.getState(state)
  const y = ystate.doc
  const decorations = []

  awareness.getStates().forEach((aw: any, clientId: any) => {
    if (clientId === y.clientID) return
    if (!aw.mouse) return
    decorations.push(Decoration.widget(0, createMouseCursor(aw.user, aw.mouse)))
  })

  return DecorationSet.create(state.doc, decorations)
}

const pluginKey = new PluginKey('y-mouse')

const yMousePlugin = (awareness: Awareness) => new Plugin({
  key: pluginKey,
  state: {
    init(_, state) {
      return createDecorations(state, awareness)
    },
    apply (tr, prevState, _oldState, newState) {
      const yCursorState = tr.getMeta(pluginKey)
      if (yCursorState?.awarenessUpdated) {
        return createDecorations(newState, awareness)
      }

      return prevState.map(tr.mapping, tr.doc)
    }
  },
  props: {
    decorations: (state) => pluginKey.getState(state)
  },
  view: (view: any): any => {
    const onAwarenessChange = () => {
      const tr = view.state.tr
      tr.setMeta(pluginKey, {awarenessUpdated: true})
      view.dispatch(tr)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (e.x !== undefined && e.y !== undefined) {
        const rect = view.dom.getBoundingClientRect()
        const x = e.x - rect.left
        const y = e.y - rect.top
        awareness.setLocalStateField('mouse', {x, y})
      }
    }

    awareness.on('change', onAwarenessChange)
    window.addEventListener('mousemove', onMouseMove)

    return {
      update: onMouseMove,
      destroy: () => {
        window.removeEventListener('mousemove', onMouseMove)
        awareness.off('change', onAwarenessChange)
        awareness.setLocalStateField('mouse', null)
      }
    }
  }
})

export default (y: YOptions): ProseMirrorExtension => ({
  plugins: (prev) => y ? [
    ...prev,
    ySyncPlugin(y.prosemirrorType),
    // @ts-ignore
    yCursorPlugin(y.provider.awareness, {cursorBuilder}),
    yMousePlugin(y.provider.awareness),
    yUndoPlugin(),
  ] : prev
})
