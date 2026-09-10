import {invoke} from '@tauri-apps/api/core'

export const lspMessage = async (
  uri: string,
  message: string,
  languageId: string | undefined = undefined,
) => invoke('lsp_message', {uri, message, languageId})
