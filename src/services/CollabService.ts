import {SetStoreFunction, Store} from 'solid-js/store'
import * as Y from 'yjs'
import {WebsocketProvider} from 'y-websocket'
import {defaultDeleteFilter, defaultProtectedNodes, ySyncPluginKey} from 'y-prosemirror'
import {adjectives, animals, uniqueNamesGenerator} from 'unique-names-generator'
import {Collab, File, State} from '@/state'
import {COLLAB_URL} from '@/env'
import * as remote from '@/remote'
import {Ctrl} from '.'

export class UndoManager extends Y.UndoManager {
  removeFromScope(type: Y.AbstractType<any>) {
    const index = this.scope.indexOf(type)
    if (index !== -1) {
      this.scope.slice(index, 1)
    }
  }

  destroy() {
    // Ignore destroy from undo plugin
  }
}

export class CollabService {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get provider() {
    return this.store.collab?.provider
  }

  get permanentUserData() {
    return this.store.collab?.permanentUserData
  }

  get undoManager() {
    return this.store.collab?.undoManager
  }

  create(room: string, connect = false): Collab {
    if (connect) {
      window.history.replaceState(null, '', `/${room}`)
    }

    const ydoc = new Y.Doc({gc: false})
    const permanentUserData = new Y.PermanentUserData(ydoc)
    const provider = new WebsocketProvider(COLLAB_URL, room, ydoc, {connect})

    const configType = ydoc.getMap('config')
    configType.set('font', this.store.config.font)
    configType.set('fontSize', this.store.config.fontSize)
    configType.set('contentWidth', this.store.config.contentWidth)
    configType.observe(this.onCollabConfigUpdate)

    const undoManager = new UndoManager([], {
      doc: ydoc,
      trackedOrigins: new Set([ySyncPluginKey, ydoc.clientID]),
      deleteFilter: (item) => defaultDeleteFilter(item, defaultProtectedNodes),
      captureTransaction: tr => tr.meta.get('addToHistory') !== false,
    })

    provider.on('connection-error', () => {
      remote.log('ERROR', '🌐 Connection error')
      this.disconnectCollab()
    })

    const xs = Object.values(this.ctrl.config.themes)
    const index = Math.floor(Math.random() * xs.length)
    const username = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      style: 'capital',
      separator: ' ',
      length: 2,
    })

    provider.awareness.setLocalStateField('user', {
      name: username,
      color: xs[index].primaryBackground,
      background: xs[index].primaryBackground,
      foreground: xs[index].primaryForeground,
    })

    return {
      started: connect,
      ydoc,
      provider,
      permanentUserData,
      undoManager,
    }
  }

  createByFile(file: File, connect = false): Collab {
    this.disconnectCollab()
    this.store.collab?.undoManager?.destroy()
    const collab = this.create(file.id, connect)
    if (file.ydoc) Y.applyUpdate(collab.ydoc!, file.ydoc)
    const type = collab.ydoc!.getXmlFragment(file.id)
    collab?.undoManager?.addToScope(type)
    return collab
  }

  apply(file: File) {
    if (file.ydoc) {
      const ydoc = this.store.collab!.ydoc!
      Y.applyUpdate(ydoc, file.ydoc)
      this.store.collab?.undoManager?.addToScope(ydoc.getXmlFragment(file.id))
    }
  }

  startCollab() {
    const currentFile = this.ctrl.file.currentFile
    window.history.replaceState(null, '', `/${currentFile?.id}`)
    this.store.collab?.provider?.connect()
    this.setState('collab', {started: true})
  }

  stopCollab() {
    this.disconnectCollab()
  }

  disconnectCollab() {
    this.store.collab?.ydoc?.getMap('config').unobserve(this.onCollabConfigUpdate)
    this.store.collab?.provider?.disconnect()
    window.history.replaceState(null, '', '/')
    this.setState('collab', {started: false})
  }

  setRendered() {
    this.setState('collab', 'rendered', true)
  }

  private onCollabConfigUpdate = (event: Y.YMapEvent<unknown>) => {
    const font = event.target.get('font') as string
    const fontSize = event.target.get('fontSize') as number
    const contentWidth = event.target.get('contentWidth') as number
    this.setState('config', {font, fontSize, contentWidth})
  }
}
