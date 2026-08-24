import {LSPClient, languageServerExtensions, type Transport} from '@codemirror/lsp-client'
import {listen} from '@tauri-apps/api/event'
import {lspMessage} from '@/remote/lsp'

export const lsp = (path: string) => {
  function createTransport(): Transport {
    let handlers: ((value: string) => void)[] = []

    void listen('lsp', (event) => {
      for (const h of handlers) h(JSON.stringify(event.payload))
    })

    return {
      send(message: string) {
        void lspMessage(path, message)
      },
      subscribe(handler: (value: string) => void) {
        handlers.push(handler)
      },
      unsubscribe(handler: (value: string) => void) {
        handlers = handlers.filter((h) => h !== handler)
      },
    }
  }

  const transport = createTransport()
  const client = new LSPClient({extensions: languageServerExtensions()}).connect(transport)
  return client.plugin(path)
}
