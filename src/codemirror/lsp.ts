import {
  hoverTooltips,
  LSPClient,
  LSPPlugin,
  serverCompletion,
  type Transport,
} from '@codemirror/lsp-client'
import {type EditorView, type KeyBinding, keymap} from '@codemirror/view'
import {listen} from '@tauri-apps/api/event'
import type * as lspTypes from 'vscode-languageserver-protocol'
import {mod} from '@/env'
import {lspMessage} from '@/remote/lsp'
import type {FileService} from '@/services/FileService'
import type {LocationService} from '@/services/LocationService'
import type {ProjectFileService} from '@/services/ProjectFileService'
import {LspUtil} from '@/utils/LspUtil'
import {copilotCompletion} from './copilot-completion'

export const lsp = (
  uri: string,
  locationService: LocationService,
  fileService: FileService,
  projectFileService: ProjectFileService,
  copilotEnabled: boolean,
) => {
  function createTransport(): Transport {
    let handlers: ((value: string) => void)[] = []

    void listen('lsp', (event) => {
      for (const h of handlers) h(JSON.stringify(event.payload))
    })

    return {
      send(message: string) {
        void lspMessage(uri, message)
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
        ...jumpToDefinitionKeymap(locationService, fileService, projectFileService),
        // ...findReferencesKeymap
      ]),
      // signatureHelp(),
      // serverDiagnostics()
      ...(copilotEnabled ? [copilotCompletion()] : []),
    ],
  }).connect(transport)

  return client.plugin(uri)
}

const jumpToDefinition =
  (
    locationService: LocationService,
    fileService: FileService,
    projectFileService: ProjectFileService,
  ) =>
  (view: EditorView) => {
    const plugin = LSPPlugin.get(view)
    if (!plugin) return false
    plugin.client.sync()

    void plugin.client
      .request<lspTypes.DefinitionParams, lspTypes.Location | lspTypes.Location[] | null>(
        'textDocument/definition',
        {
          textDocument: {uri: plugin.uri},
          position: plugin.toPosition(view.state.selection.main.head),
        },
      )
      .then(async (response) => {
        const loc = Array.isArray(response) ? response[0] : response
        if (!loc) return

        const currentFileId = fileService.currentFile?.id

        if (
          loc.uri === `file://${fileService.currentFile?.path}` ||
          (currentFileId && loc.uri.startsWith(LspUtil.createBufferUri(currentFileId)))
        ) {
          const selection = LspUtil.createSelection(view, loc.range)
          view.dispatch({selection})
        } else if (LspUtil.isBufferUri(loc.uri)) {
          const [id] = LspUtil.parseBufferUri(loc.uri)
          const file = fileService.findFileById(id)
          if (file) locationService.openItem(file, {selection: loc.range})
        } else {
          const path = LspUtil.uriToPath(loc.uri)
          const file = await projectFileService.newFileByPath({path})
          locationService.openItem(file, {selection: loc.range})
        }
      })

    return true
  }

export const jumpToDefinitionKeymap = (
  locationService: LocationService,
  fileService: FileService,
  projectFileService: ProjectFileService,
): KeyBinding[] => [
  {
    key: `${mod}-d`,
    run: jumpToDefinition(locationService, fileService, projectFileService),
    preventDefault: true,
  },
]
