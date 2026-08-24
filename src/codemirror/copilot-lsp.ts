import {LSPClient, type Transport} from '@codemirror/lsp-client'
import {listen} from '@tauri-apps/api/event'
import {lspMessage} from '@/remote/lsp'
import {copilotCompletion} from './copilot-completion'

export const copilotLsp = (path: string) => {
  function createTransport(): Transport {
    let handlers: ((value: string) => void)[] = []

    void listen('lsp', (event) => {
      for (const h of handlers) h(JSON.stringify(event.payload))
    })

    return {
      send(message: string) {
        void lspMessage(path, message, 'copilot')
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
  const client = new LSPClient({extensions: [copilotCompletion()]}).connect(transport)
  return client.plugin(path)
}
