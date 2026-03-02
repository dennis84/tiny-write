import {createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {adjectives, animals, uniqueNamesGenerator} from 'unique-names-generator'
import {defaultDeleteFilter, defaultProtectedNodes, ySyncPluginKey} from 'y-prosemirror'
import {YMultiDocUndoManager} from 'y-utility/y-multidoc-undomanager'
import {WebsocketProvider} from 'y-websocket'
import * as Y from 'yjs'
import {COLLAB_URL, isTauri, WEB_URL} from '@/env'
import {info} from '@/remote/log'
import {type Config, type File, Page, type State} from '@/types'
import {TauriWebSocket} from '@/utils/TauriWebSocket'
import {ConfigService} from './ConfigService'
import type {DialogService} from './DialogService'
import type {LocationService} from './LocationService'

export class CollabService {
  private providers: Map<string, WebsocketProvider> = new Map()
  private subdocs: Map<string, Y.Doc> = new Map()
  private _provider: WebsocketProvider | undefined
  private _ydoc: Y.Doc | undefined
  private _permanentUserData: Y.PermanentUserData | undefined
  private _undoManager: YMultiDocUndoManager | undefined

  private startedSignal = createSignal(false)

  constructor(
    private dialogService: DialogService,
    private locationService: LocationService,
    _store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get started() {
    return this.startedSignal[0]
  }

  get provider(): WebsocketProvider | undefined {
    return this._provider
  }

  get ydoc(): Y.Doc | undefined {
    return this._ydoc
  }

  get permanentUserData(): Y.PermanentUserData | undefined {
    return this._permanentUserData
  }

  get undoManager(): YMultiDocUndoManager | undefined {
    return this._undoManager
  }

  init(id: string, page: Page, connect = false) {
    const room = `${page}/${id}`
    info(`Create ydoc: (room=${room}, connect=${connect})`)

    this._ydoc = new Y.Doc({guid: room})

    this._permanentUserData = new Y.PermanentUserData(this._ydoc)
    const WebSocketPolyfill = CollabService.createWS()
    this._provider = new WebsocketProvider(COLLAB_URL, room, this._ydoc, {
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

    this._provider.awareness.setLocalStateField('user', {
      name: username,
      color: xs[index].primaryBackground,
      background: xs[index].primaryBackground,
      foreground: xs[index].primaryForeground,
    })

    this._undoManager = new YMultiDocUndoManager([], {
      trackedOrigins: new Set([ySyncPluginKey, this._ydoc.clientID]),
      deleteFilter: (item: any) => defaultDeleteFilter(item, defaultProtectedNodes),
      captureTransaction: (tr: any) => tr.meta.get('addToHistory') !== false,
    })
  }

  private static createWS() {
    return !isTauri() ? window.WebSocket : (TauriWebSocket as any)
  }

  registerListeners() {
    info(`Register collab listeners`)

    if (!this.provider) {
      throw new Error('Collab not created in state')
    }

    this.provider.on('connection-error', () => {
      this.dialogService.toast({message: 'Collaboration connection error'})
      this.disconnect()
    })

    const configType = this.ydoc?.getMap('config')
    configType?.observe(this.onCollabConfigUpdate)
  }

  addToScope(file: File) {
    const subdoc = this.getSubdoc(file.id)
    const type = file.code ? subdoc.getText(file.id) : subdoc.getXmlFragment(file.id)
    this.undoManager?.addToScope([type])
  }

  connect(id: string | undefined = undefined) {
    if (!this.provider?.wsconnected) {
      info(`Conntect to root collab provider (room=${this.provider?.roomname})`)
      this.provider?.connect()
    }

    const ids = id ? [id] : Array.from(this.providers.keys())
    for (const id of ids) {
      const p = this.providers.get(id)
      if (p && !p.wsconnected) {
        info(`Conntect to subdoc collab provider (room=${p.roomname})`)
        this.providers.get(id)?.connect()
      }
    }

    info('Set collab started to true')
    this.startedSignal[1](true)
  }

  disconnect(id: string | undefined = undefined) {
    const ids = id ? [id] : Array.from(this.providers.keys())
    for (const id of ids) {
      info(`Disconnect from subdoc collab provider (room=${this.providers.get(id)?.roomname})`)
      this.providers.get(id)?.disconnect()
    }

    if (ids.length === this.providers.size) {
      info(`Disconnect from root collab provider (room=${this.provider?.roomname})`)
      this.ydoc?.getMap('config').unobserve(this.onCollabConfigUpdate)
      this.provider?.disconnect()
      this.startedSignal[1](false)
    }
  }

  destroy(id: string | undefined = undefined) {
    const ids = id ? [id] : Array.from(this.providers.keys())
    info(`Destroy collab (ids=${ids.join(', ')})`)
    for (const id of ids) {
      this.disconnect(id)
      this.providers.get(id)?.destroy()
      this.providers.delete(id)
      this.subdocs.get(id)?.destroy()
      this.subdocs.delete(id)
    }
  }

  setConfig(conf: Partial<Config>) {
    if (conf.font) this.ydoc?.getMap('config').set('font', conf.font)
    if (conf.fontSize) this.ydoc?.getMap('config').set('fontSize', conf.fontSize)
    if (conf.contentWidth) this.ydoc?.getMap('config').set('contentWidth', conf.contentWidth)
  }

  createSubdocProvider(id: string): WebsocketProvider {
    const subdoc = this.getSubdoc(id)

    const connect = false
    info(`Create provider for subdoc (id=${id}, connect=${connect})`)
    const WebSocketPolyfill = CollabService.createWS()

    const provider = new WebsocketProvider(COLLAB_URL, id, subdoc, {
      connect,
      WebSocketPolyfill,
    })

    this.providers.set(id, provider)

    return provider
  }

  getProvider(id: string): WebsocketProvider | undefined {
    return this.providers.get(id)
  }

  getSubdoc(id: string): Y.Doc {
    // Store subdocs in map instead real subdocs, otherwise they
    // are not synced correctly with y-websocket provider.
    let subdoc = this.subdocs.get(id)
    if (subdoc) return subdoc

    subdoc = new Y.Doc({guid: id})
    this.subdocs.set(id, subdoc)
    return subdoc
  }

  getJoinUrl(): string | undefined {
    if (this.locationService.page === Page.Editor) {
      return `${WEB_URL}/editor?join=${this.locationService.editorId}`
    } else if (this.locationService.page === Page.Code) {
      return `${WEB_URL}/code?join=${this.locationService.codeId}`
    } else if (this.locationService.page === Page.Canvas) {
      return `${WEB_URL}/canvas?join=${this.locationService.canvasId}`
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
