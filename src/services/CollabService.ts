import {SetStoreFunction, Store} from 'solid-js/store'
import * as Y from 'yjs'
import {WebsocketProvider} from 'y-websocket'
import {defaultDeleteFilter, defaultProtectedNodes, ySyncPluginKey} from 'y-prosemirror'
import {adjectives, animals, uniqueNamesGenerator} from 'unique-names-generator'
import {Collab, Config, File, Mode, State} from '@/state'
import {COLLAB_URL, isTauri} from '@/env'
import * as remote from '@/remote'
import {TauriWebSocket} from '@/utils/TauriWebSocket'
import {Ctrl} from '.'
import {ConfigService} from './ConfigService'

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

  get room() {
    return this.store.mode === Mode.Canvas ?
      this.ctrl.canvas.currentCanvas?.id :
      this.ctrl.file.currentFile?.id
  }

  get isSnapshot(): boolean {
    return this.store.collab?.snapshot !== undefined
  }

  static create(room: string, mode = Mode.Editor, connect = false): Collab {
    remote.info(`Create ydoc: (room=${room}, mode=${mode}, connect=${connect})`)

    if (connect) {
      window.history.replaceState(null, '', `/${mode}/${room}`)
    } else {
      window.history.replaceState(null, '', '/')
    }

    const WebSocketPolyfill = CollabService.createWS()

    const ydoc = new Y.Doc({gc: false})
    const permanentUserData = new Y.PermanentUserData(ydoc)
    const provider = new WebsocketProvider(COLLAB_URL, room, ydoc, {connect, WebSocketPolyfill})

    const undoManager = new UndoManager([], {
      doc: ydoc,
      trackedOrigins: new Set([ySyncPluginKey, ydoc.clientID]),
      deleteFilter: (item) => defaultDeleteFilter(item, defaultProtectedNodes),
      captureTransaction: tr => tr.meta.get('addToHistory') !== false,
    })

    const xs = Object.values(ConfigService.themes)
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
      rendered: false,
      ydoc,
      provider,
      permanentUserData,
      undoManager,
    }
  }

  private static createWS(): typeof WebSocket {
    if (!isTauri()) {
      return window.WebSocket
    }

    return TauriWebSocket as any
  }

  apply(file: File) {
    if (file.ydoc) {
      const ydoc = this.store.collab!.ydoc
      if (!this.store.collab?.started) {
        Y.applyUpdate(ydoc, file.ydoc)
      }
      const type = file.code ? ydoc.getText(file.id) : ydoc.getXmlFragment(file.id)
      this.store.collab?.undoManager?.addToScope(type)
    }
  }

  init() {
    if (!this.provider) {
      throw new Error('Collab not created in state')
    }

    this.provider.on('connection-error', () => {
      remote.error('🌐 Connection error')
      this.setState('collab', 'error', true)
      if (this.provider) {
        this.provider.wsconnected = false
        this.provider.ws = null
      }
    })

    this.provider.on('status', (e: any) => {
      if (e.status === 'connected') {
        this.setState('collab', 'error', undefined)
      }
    })

    const configType = this.store.collab?.ydoc?.getMap('config')
    configType?.observe(this.onCollabConfigUpdate)
  }

  startCollab() {
    window.history.replaceState(null, '', `/${this.store.mode}/${this.room}`)
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
    this.setState('collab', {started: false, error: undefined})
  }

  setRendered() {
    this.setState('collab', 'rendered', true)
  }

  setConfig(conf: Partial<Config>) {
    if (conf.font) this.store.collab?.ydoc?.getMap('config').set('font', conf.font)
    if (conf.fontSize) this.store.collab?.ydoc?.getMap('config').set('fontSize', conf.fontSize)
    if (conf.contentWidth) this.store.collab?.ydoc?.getMap('config').set('contentWidth', conf.contentWidth)
  }

  private onCollabConfigUpdate = (event: Y.YMapEvent<unknown>) => {
    const font = event.target.get('font') as string
    const fontSize = event.target.get('fontSize') as number
    const contentWidth = event.target.get('contentWidth') as number
    const update: any = {}
    if (font) update.font = font
    if (fontSize) update.fontSize = fontSize
    if (contentWidth) update.contentWidth = contentWidth
    this.setState('config', update)
  }
}
