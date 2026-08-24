import {invoke} from '@tauri-apps/api/core'
import type {VisualPositionRange} from '@/types'

export const lspMessage = async (
  path: string,
  message: string,
  languageId: string | undefined = undefined,
) => invoke('lsp_message', {path, message, languageId})

type LspGoto = {uri: string; range: VisualPositionRange}[]

export const lspGoto = async (path: string, pos: number): Promise<LspGoto> => {
  return await invoke('lsp_goto', {path, pos})
}

export const lspRegisterDocument = async (path: string): Promise<void> => {
  return await invoke('lsp_register_document', {path})
}
