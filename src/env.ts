import {version} from '../package.json'

export const isTauri = (window as any).__TAURI__ !== undefined

export const isMac =
  window.process?.platform === 'darwin' ||
  window.navigator.platform.indexOf('Mac') !== -1

export const mod = isMac ? 'Cmd' : 'Ctrl'
export const alt = isMac ? 'Cmd' : 'Alt'

export const WEB_URL =
  //'http://localhost:3000'
  'https://tiny-write.pages.dev'

export const COLLAB_URL =
  //'ws://localhost:1234'
  'wss://amplified-brook-building.glitch.me'

export const VERSION_URL =
  `https://github.com/dennis84/tiny-write/releases/tag/v${version}`
