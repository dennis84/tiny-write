import {invoke} from '@tauri-apps/api/core'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {open as shellOpen} from '@tauri-apps/plugin-shell'
import type {Args} from '@/state'

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

export const setFullscreen = async (status: boolean): Promise<void> => {
  await getCurrentWindow().setSimpleFullscreen(status)
  // Workaround for keep the window focused. This was the only way I found,
  // setFocus() didn't work and isFucused() returned true, but Mac always beeps
  // when typing after changing fullscreen state.
  await getCurrentWindow().hide()
  await getCurrentWindow().show()
}

export const open = async (href: string) => {
  await shellOpen(href)
}
