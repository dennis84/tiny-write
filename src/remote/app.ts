import {invoke} from '@tauri-apps/api/core'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {open as shellOpen} from '@tauri-apps/plugin-shell'
import {Args} from '@/state'

export const getArgs = async (): Promise<Args> => {
  return invoke('get_args')
}

export const setAlwaysOnTop = (alwaysOnTop: boolean): Promise<void> => {
  return getCurrentWindow().setAlwaysOnTop(alwaysOnTop)
}

export const quit = (): Promise<void> => {
  return getCurrentWindow().close()
}

export const isFullscreen = (): Promise<boolean> => {
  return getCurrentWindow().isFullscreen()
}

export const setFullscreen = (status: boolean): Promise<void> => {
  return getCurrentWindow().setFullscreen(status)
}

export const open = async (href: string) => {
  await shellOpen(href)
}
