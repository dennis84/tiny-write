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
import {IndexeddbPersistence} from 'y-indexeddb'
import { pause } from '@/utils/promise'

export class CollabService {
  private idbs: Map<string, IndexeddbPersistence> = new Map()
  private providers: Map<string, WebsocketProvider> = new Map()

  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get provider() {
    return this.store.collab?.provider
  }

  // get providers() {
  //   return this.store.collab?.providers ?? {}
  // }
  //
  get permanentUserData() {
    return this.store.collab?.permanentUserData
  }

  get undoManager() {
    return this.store.collab?.undoManager
  }

  static create(id: string, page: Page, connect = false): Collab {
    const room = `${page}/${id}`
    info(`Create ydoc: (room=${room}, connect=${connect})`)

    const ydoc = new Y.Doc({guid: room})
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
    const container = ydoc.getMap<Y.Doc>('subdocs')
    let subdoc = container.get(id)
    if (!subdoc) {
      info(`Create subdoc (id=${id})`)
      subdoc = new Y.Doc({guid: id})
      container.set(id, subdoc)
    }

    if (!subdoc.isLoaded) subdoc.load()

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

    // Immediately auto-load any already-known subdocs
    this.store.collab?.ydoc.getSubdocs().forEach((subdoc) => {
      if (!subdoc.isLoaded) subdoc.load()
    })

    this.store.collab?.ydoc.on('subdocs', ({loaded, added}) => {
      added.forEach((subdoc) => {
        if (!subdoc.isLoaded) subdoc.load()
      })

      // loaded.forEach(async (subdoc) => {
      //   await this.createSubdocProvider(subdoc.guid)
      // })
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

    for (const p of this.providers.values()) {
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
    for (const p of this.providers.values()) p.disconnect()
    this.setState('collab', {started: false, error: undefined})
  }

  setConfig(conf: Partial<Config>) {
    if (conf.font) this.store.collab?.ydoc?.getMap('config').set('font', conf.font)
    if (conf.fontSize) this.store.collab?.ydoc?.getMap('config').set('fontSize', conf.fontSize)
    if (conf.contentWidth)
      this.store.collab?.ydoc?.getMap('config').set('contentWidth', conf.contentWidth)
  }

  async createSubdocProvider(id: string): Promise<WebsocketProvider> {
    const subdoc = this.getSubdoc(id)
    subdoc.load()

    const idb = new IndexeddbPersistence(id, subdoc)
    await idb.whenSynced

    const connect = false
    info(`Create provider for subdoc (id=${id}, connect=${connect})`)
    const WebSocketPolyfill = CollabService.createWS()
    const provider = new WebsocketProvider(COLLAB_URL, id, subdoc, {
      connect,
      WebSocketPolyfill,
    })

    this.providers.set(id, provider)
    this.idbs.set(id, idb)

    return provider
  }

  getSubdoc(id: string): Y.Doc {
    const ydoc = this.store.collab?.ydoc
    if (!ydoc) throw new Error('Collab state was not created')
    return CollabService.getSubdoc(ydoc, id)
  }

  destroySubdoc(id: string) {
    this.disconnectCollab()
    this.providers.get(id)?.destroy()
    this.providers.delete(id)
    this.idbs.get(id)?.destroy()
    this.idbs.delete(id)
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
