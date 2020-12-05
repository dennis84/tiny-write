const userAgent = window.navigator.userAgent.toLowerCase()

export const isElectron = userAgent.indexOf(' electron/') > -1

export const isMac = process.platform === 'darwin'

export const mod = isMac && isElectron ? 'Cmd' : 'Ctrl'