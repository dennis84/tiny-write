import {invoke} from '@tauri-apps/api/core'
import {VisualPositionRange} from '@/state'

type LspHover = {contents: {value: string}}

export const lspHover = async (path: string, pos: number): Promise<LspHover> => {
  return await invoke('lsp_hover', {path, pos})
}

type LspCompletionItem = {label: string; sortText: string; kind?: number; detail: string}
type LspCompletion = {items: LspCompletionItem[]}

export const lspCompletion = async (
  path: string,
  pos: number,
  trigger: string,
): Promise<LspCompletion> => {
  return await invoke('lsp_completion', {path, pos, trigger})
}

type LspGoto = {uri: string; range: VisualPositionRange}[]

export const lspGoto = async (path: string, pos: number): Promise<LspGoto> => {
  return await invoke('lsp_goto', {path, pos})
}
