import WebSocket from 'tauri-plugin-websocket-api'
import * as remote from '@/remote'

export class TauriWebSocket {
  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3

  public binaryType = 'blob'
  public readyState = this.CLOSED

  private ws: WebSocket | undefined
  private onMessage: any
  private onOpen: any
  private onError: any
  private onClose: any

  constructor(public url: string) {
    WebSocket.connect(url).then((ws) => {
      this.ws = ws
      this.readyState = this.OPEN
      ws.addListener((message) => {
        if (message.type === 'Binary') {
          this.onMessage(message)
        }
      })

      remote.log('INFO', `🌐 Connection opened (url=${url})`)
      this.onOpen()
    })
  }

  get onopen(): any { return this.onOpen }
  get onerror(): any { return this.onError }
  get onclose(): any { return this.onClose }
  get onmessage(): any { return this.onMessage }

  set onopen(fn) { this.onOpen = fn }
  set onerror(fn) { this.onError = fn }
  set onclose(fn) { this.onClose = fn }
  set onmessage(fn) { this.onMessage = fn }

  close() {
    this.ws?.disconnect()
    this.readyState = this.CLOSED
  }

  send(data: any) {
    this.ws?.send({type: 'Binary', data: [...data]})
      .catch((e) => this.onError(e))
  }
}