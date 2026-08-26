import {
  LSPClient,
  LSPPlugin,
  Workspace,
  WorkspaceFile,
  formatKeymap,
  hoverTooltips,
  languageServerExtensions,
  serverCompletion,
  serverDiagnostics,
  signatureHelp,
  type Transport,
} from '@codemirror/lsp-client'
import {listen} from '@tauri-apps/api/event'
import {lspMessage} from '@/remote/lsp'
import {EditorView, KeyBinding, keymap} from '@codemirror/view'
import {LocationService} from '@/services/LocationService'
import {FileService} from '@/services/FileService'
import {info, warn} from '@/remote/log'
import {VisualPositionRange} from '@/types'
import {mod} from '@/env'
import type * as lspTypes from "vscode-languageserver-protocol"

class WorkspaceImpl extends Workspace {
  constructor(
    client: LSPClient,
    private locationService: LocationService,
    private fileService: FileService,
  ) {
    super(client)
  }

  files: WorkspaceFile[] = []

  syncFiles() {
    return []
  }

  openFile(uri: string, languageId: string, view: EditorView) {
    info(`Open LSP workspace file (uri=${uri})`)

    if (uri.startsWith('buffer://')) {
      const pos = uri.lastIndexOf('.')
      const id = uri.substring(9, pos)
      const file = this.fileService.findFileById(id)
      console.log(view.state.selection.main.from, view.state.selection.main.to)
      // const selection: VisualPositionRange = {
      //   start: view.state.selection.main.from,
      //   end: view.state.selection.main.to,
      // }
      if (file) this.locationService.openItem(file)
      return
    }

    void this.fileService.findFileByPath(uri).then((file) => {
      if (file) this.locationService.openItem(file)
    })

    // const selection = first.range
    // const file = await projectFileService.newFileByPath({path: url.pathname})
    // locationService.openItem(file, {selection})
  }

  closeFile(uri: string) {
    warn(`Close LSP workspace file not implemented (uri=${uri})`)
  }
}

export const lsp = (path: string, locationService: LocationService, fileService: FileService) => {
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
  const client = new LSPClient({
    extensions: [
      serverCompletion(),
      hoverTooltips(),
      keymap.of([
        // ...formatKeymap,
        // ...renameKeymap,
        //
        ...jumpToDefinitionKeymap(locationService),
        // ...findReferencesKeymap
      ]),
      // signatureHelp(),
      // serverDiagnostics()
    ],
    // workspace: (c) => new WorkspaceImpl(c, locationService, fileService),
  }).connect(transport)
  return client.plugin(path)
}

const jumpToDefinition = (locationService: LocationService) => (view: EditorView) => {
  const plugin = LSPPlugin.get(view)
  if (!plugin) return false
  plugin.client.sync()

  plugin.client.withMapping((mapping) => {
    return plugin.client.request<lspTypes.DefinitionParams, lspTypes.Location | lspTypes.Location[] | null>("textDocument/definition", {
      textDocument: {uri: plugin.uri},
      position: plugin.toPosition(view.state.selection.main.head)
    }).then((response) => {
      let loc = Array.isArray(response) ? response[0] : response
      console.log({loc})
      if (!loc) return

    })
  })

  return true
}

export const jumpToDefinitionKeymap = (locationService: LocationService): KeyBinding[] => [
  {key: `${mod}-d`, run: jumpToDefinition(locationService), preventDefault: true},
]
