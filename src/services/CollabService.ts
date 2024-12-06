import {SetStoreFunction, Store} from 'solid-js/store'
import * as Y from 'yjs'
import {WebsocketProvider} from 'y-websocket'
import {YMultiDocUndoManager} from 'y-utility/y-multidoc-undomanager'
import {defaultDeleteFilter, defaultProtectedNodes, ySyncPluginKey} from 'y-prosemirror'
import {adjectives, animals, uniqueNamesGenerator} from 'unique-names-generator'
import {Collab, Config, File, Mode, State} from '@/state'
import {COLLAB_URL, isTauri} from '@/env'
import {error, info} from '@/remote/log'
import {TauriWebSocket} from '@/utils/TauriWebSocket'
import {ConfigService} from './ConfigService'

export class CollabService {
  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get provider() {
    return this.store.collab?.provider
  }

  get providers() {
    return this.store.collab?.providers ?? {}
  }

  get permanentUserData() {
    return this.store.collab?.permanentUserData
  }

  get undoManager() {
    return this.store.collab?.undoManager
  }

  get isSnapshot(): boolean {
    return this.store.collab?.snapshot !== undefined
  }

  static create(id: string, mode = Mode.Editor, connect = false): Collab {
    info(`Create ydoc: (id=${id}, mode=${mode}, connect=${connect})`)
    const room = `${mode}/${id}`

    const ydoc = new Y.Doc({gc: false, guid: room})
    const permanentUserData = new Y.PermanentUserData(ydoc)
    const WebSocketPolyfill = CollabService.createWS()
    const provider = new WebsocketProvider(COLLAB_URL, room, ydoc, {
      connect: false,
      WebSocketPolyfill,
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

    const undoManager = new YMultiDocUndoManager([], {
      trackedOrigins: new Set([ySyncPluginKey, ydoc.clientID]),
      deleteFilter: (item: any) => defaultDeleteFilter(item, defaultProtectedNodes),
      captureTransaction: (tr: any) => tr.meta.get('addToHistory') !== false,
    })

    return {
      id,
      started: connect,
      ydoc,
      provider,
      providers: {},
      undoManager,
      permanentUserData,
    }
  }

  static getSubdoc(ydoc: Y.Doc, id: string): Y.Doc {
    let subdoc = ydoc.getMap<Y.Doc>().get(id)
    if (!subdoc) {
      subdoc = new Y.Doc({gc: false, guid: id})
      ydoc.getMap().set(id, subdoc)
    }

    return subdoc
  }

  private static createWS() {
    return !isTauri() ? window.WebSocket : (TauriWebSocket as any)
  }

  init(file?: File) {
    info(`Init collab (fileId=${file?.id}, connect=${this.store.collab?.started})`)

    if (!this.provider) {
      throw new Error('Collab not created in state')
    }

    this.provider.on('connection-error', () => {
      error('🌐 Connection error')
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

    this.store.collab?.ydoc.on('subdocs', ({loaded}) => {
      loaded.forEach((subdoc) => this.getSubdoc(subdoc.guid))
    })

    this.provider.on('synced', () => {
      if (!file) return
      this.initFile(file)
    })

    if (!this.store.collab?.started) {
      this.provider.emit('synced', [])
    } else {
      this.provider.connect()
    }
  }

  initFile(file: File) {
    const subdoc = this.getSubdoc(file.id)
    if (!file.path) {
      info('Apply collab update after synced')
      Y.applyUpdate(subdoc, file.ydoc)
    }

    const type = file.code ? subdoc.getText(file.id) : subdoc.getXmlFragment(file.id)
    this.undoManager?.addToScope([type])
  }

  startCollab() {
    this.store.collab?.provider?.connect()
    for (const p of Object.values(this.providers)) p.connect()
    this.setState('collab', {started: true})
  }

  stopCollab() {
    this.disconnectCollab()
  }

  disconnectCollab() {
    this.store.collab?.ydoc?.getMap('config').unobserve(this.onCollabConfigUpdate)
    this.store.collab?.provider?.disconnect()
    for (const p of Object.values(this.providers)) p.disconnect()
    this.setState('collab', {started: false, error: undefined})
  }

  setConfig(conf: Partial<Config>) {
    if (conf.font) this.store.collab?.ydoc?.getMap('config').set('font', conf.font)
    if (conf.fontSize) this.store.collab?.ydoc?.getMap('config').set('fontSize', conf.fontSize)
    if (conf.contentWidth)
      this.store.collab?.ydoc?.getMap('config').set('contentWidth', conf.contentWidth)
  }

  hasSubdoc(id: string): boolean {
    const ydoc = this.store.collab?.ydoc
    return ydoc?.getMap().has(id) ?? false
  }

  getSubdoc(id: string): Y.Doc {
    const ydoc = this.store.collab?.ydoc
    if (!ydoc) throw new Error('Collab state was not created')

    const subdoc = CollabService.getSubdoc(ydoc, id)
    const connect = this.store.collab?.started ?? false

    if (!this.providers[id]) {
      info(`Create provider for subdoc (id=${id}, connect=${connect})`)
      const WebSocketPolyfill = CollabService.createWS()
      const provider = new WebsocketProvider(COLLAB_URL, id, subdoc, {connect, WebSocketPolyfill})
      this.setState('collab', 'providers', id, provider)
    }

    return subdoc
  }

  getProvider(id: string): WebsocketProvider {
    return this.providers[id]!
  }

  private onCollabConfigUpdate = (event: Y.YMapEvent<unknown>) => {
    const font = event.target.get('font') as string
    const fontSize = event.target.get('fontSize') as number
    const contentWidth = event.target.get('contentWidth') as number
    const update: Partial<Config> = {}
    if (font) update.font = font
    if (fontSize) update.fontSize = fontSize
    if (contentWidth) update.contentWidth = contentWidth
    this.setState('config', update)
  }
}
