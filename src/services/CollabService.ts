import type {SetStoreFunction, Store} from 'solid-js/store'
import {adjectives, animals, uniqueNamesGenerator} from 'unique-names-generator'
import {defaultDeleteFilter, defaultProtectedNodes, ySyncPluginKey} from 'y-prosemirror'
import {YMultiDocUndoManager} from 'y-utility/y-multidoc-undomanager'
import {WebsocketProvider} from 'y-websocket'
import * as Y from 'yjs'
import {COLLAB_URL, isTauri, WEB_URL} from '@/env'
import {error, info} from '@/remote/log'
import {type Collab, type Config, type File, Page, type State} from '@/state'
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

  static create(id: string, page: Page, connect = false): Collab {
    const room = `${page}/${id}`
    info(`Create ydoc: (room=${room}, connect=${connect})`)

    const ydoc = CollabService.createYdoc()
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

  static createYdoc(): Y.Doc {
    return new Y.Doc({gc: true})
  }

  static getSubdoc(ydoc: Y.Doc, id: string): Y.Doc {
    let subdoc = ydoc.getMap<Y.Doc>().get(id)
    if (!subdoc) {
      info(`Create subdoc (id=${id})`)
      subdoc = CollabService.createYdoc()
      ydoc.getMap().set(id, subdoc)
    }

    return subdoc
  }

  private static createWS() {
    return !isTauri() ? window.WebSocket : (TauriWebSocket as any)
  }

  registerListeners() {
    info(`Register collab listeners (connect=${this.store.collab?.started})`)

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
      loaded.forEach((subdoc) => {
        this.getSubdoc(subdoc.guid)
      })
    })
  }

  addToScope(file: File) {
    const subdoc = this.getSubdoc(file.id)
    const type = file.code ? subdoc.getText(file.id) : subdoc.getXmlFragment(file.id)
    this.undoManager?.addToScope([type])
  }

  startCollab() {
    info(`Conntect collab provider (room=${this.store.collab?.provider.roomname})`)
    this.store.collab?.provider?.connect()

    for (const p of Object.values(this.providers)) {
      info(`Conntect collab provider (room=${p.roomname})`)
      p.connect()
    }

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

    if (!this.providers[id]) {
      const connect = false // this.store.collab?.started ?? false
      info(`Create provider for subdoc (id=${id}, connect=${connect})`)
      const WebSocketPolyfill = CollabService.createWS()
      const provider = new WebsocketProvider(COLLAB_URL, id, subdoc, {connect, WebSocketPolyfill})
      this.setState('collab', 'providers', id, provider)
    }

    return subdoc
  }

  getProvider(id: string): WebsocketProvider {
    return this.providers[id]
  }

  getJoinUrl(): string | undefined {
    if (this.store.location?.page === Page.Editor) {
      return `${WEB_URL}/editor?join=${this.store.location.editorId}`
    } else if (this.store.location?.page === Page.Code) {
      return `${WEB_URL}/code?join=${this.store.location.codeId}`
    } else if (this.store.location?.page === Page.Canvas) {
      return `${WEB_URL}/canvas?join=${this.store.location.canvasId}`
    }
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
