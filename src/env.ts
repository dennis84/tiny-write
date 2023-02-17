import {version as v} from '../package.json'

export const version = v

export const isTauri = (window as any).__TAURI__ !== undefined

export const isDark = () => (window as any).matchMedia('(prefers-color-scheme: dark)').matches

export const isTest = import.meta.env.NODE_ENV === 'test'
export const isDev = import.meta.env.DEV

export const isMac =
  window.process?.platform === 'darwin' ||
  window.navigator.platform.indexOf('Mac') !== -1

export const mod = isMac ? 'Cmd' : 'Ctrl'
export const alt = isMac ? 'Cmd' : 'Alt'

export const WEB_URL =
  (isTest || isDev) ? 'http://localhost:3000' :
  'https://tiny-write.pages.dev'

export const COLLAB_URL =
  (isTest || isDev) ? 'ws://localhost:1234' :
  'wss://y-websocket-88ps.onrender.com'

export const VERSION_URL =
  `https://github.com/dennis84/tiny-write/releases/tag/v${version}`
