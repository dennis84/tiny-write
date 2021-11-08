import {EditorState} from 'prosemirror-state'
import {serialize} from './markdown'
import {isTauri} from './env'
import {appWindow} from '@tauri-apps/api/window'
import {invoke} from '@tauri-apps/api/tauri'
import * as clipboard from '@tauri-apps/api/clipboard'
import * as fs from '@tauri-apps/api/fs'
import * as dialog from '@tauri-apps/api/dialog'

export const on = (name: string, fn: (...args: any) => void) => {
  if (!isTauri) return
  // window.app.on(name, fn)
}

export const getArgs = async () => {
  if (!isTauri) return
  return await invoke('get_args')
}

export const setAlwaysOnTop = (alwaysOnTop: boolean) => {
  if (!isTauri) return
  return appWindow.setAlwaysOnTop(alwaysOnTop)
}

export const quit = () => {
  if (!isTauri) return
  return appWindow.close()
}

export const isFullscreen = () => {
  if (!isTauri) return
  return appWindow.isFullscreen()
}

export const setFullscreen = (status: boolean) => {
  if (!isTauri) return
  return appWindow.setFullscreen(status)
}

export const copy = async (text: string) => {
  if (isTauri) {
    return clipboard.writeText(text)
  } else {
    navigator.clipboard.writeText(text)
  }
}

export const copyAllAsMarkdown = async (state: EditorState) => {
  const text = serialize(state)
  if (isTauri) {
    return clipboard.writeText(text)
  } else {
    navigator.clipboard.writeText(text)
  }
}

export const getMimeType = async (path: string): Promise<string> => {
  return invoke('get_mime_type', {path})
}

export const readFile = async (src: string) => {
  if (!isTauri) return
  return fs.readTextFile(src)
}

export const readBinaryFile = async (src: string) => {
  if (!isTauri) return
  return fs.readBinaryFile(src)
}

export const writeFile = async (path: string, contents: string) => {
  if (!isTauri) return
  return fs.writeFile({path, contents})
}

export const resolve = async (paths: string[]) => {
  return invoke('resolve', {paths})
}

export const log = async (...args: any) => {
  if (!isTauri) return
  return invoke('log', {args})
}

export const save = async (state: EditorState) => {
  if (!isTauri) return
  const path = await dialog.save()
  await fs.writeFile({path, contents: serialize(state)})
  return path
}
