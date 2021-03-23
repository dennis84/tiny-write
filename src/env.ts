const userAgent = window.navigator.userAgent.toLowerCase()

export const isElectron = userAgent.indexOf(' electron/') > -1

export const isMac =
  window.process?.platform === 'darwin' ||
  window.navigator.platform.indexOf('Mac') !== -1

export const mod = isMac ? 'Cmd' : 'Ctrl'
export const alt = isMac ? 'Cmd' : 'Alt'

export const COLLAB_URL =
  //'ws://localhost:1234'
  'wss://plucky-spectacled-drawbridge.glitch.me'
