const userAgent = window.navigator.userAgent.toLowerCase()

export const isElectron = userAgent.indexOf(' electron/') > -1

export const isMac = (window as any).process?.platform === 'darwin'

export const mod = isMac && isElectron ? 'Cmd' : 'Ctrl'
