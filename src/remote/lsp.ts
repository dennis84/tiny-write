import {invoke} from '@tauri-apps/api/core'

export const lspHover = async (path: string, pos: number) => {
  return await invoke('lsp_hover', {path, pos})
}

export const lspCompletion = async (path: string, pos: number, trigger: string) => {
  return await invoke('lsp_completion', {path, pos, trigger})
}

export const lspGoto = async (path: string, pos: number) => {
  return await invoke('lsp_goto', {path, pos})
}
