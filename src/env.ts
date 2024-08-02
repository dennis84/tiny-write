import {version as v} from '../package.json'

export const shortHash = __COMMIT_HASH__

export const version = v

export const isTauri = () => (window as any).__TAURI_INTERNALS__ !== undefined

export const isDark = () => (window as any).matchMedia('(prefers-color-scheme: dark)').matches

export const isTest = import.meta.env.NODE_ENV === 'test'
export const isDev = import.meta.env.DEV

export const isMac = navigator.userAgent.includes('Mac')

export const mod = isMac ? 'Meta' : 'Ctrl'
export const alt = isMac ? 'Meta' : 'Alt'

export const WEB_URL = isTest || isDev ? 'http://localhost:3000' : 'https://tiny-write.pages.dev'

export const COLLAB_URL =
  isTest || isDev ? 'ws://localhost:1234' : 'wss://y-websocket-88ps.onrender.com'

export const VERSION_URL = `https://github.com/dennis84/tiny-write/releases/tag/v${version}`
