import {markdownSerializer} from './markdown'
import {EditorState} from 'prosemirror-state'
import {isElectron} from './env'

const electron = (window as any).require?.('electron')
const remote = electron?.remote

export const setAlwaysOnTop = (alwaysOnTop) => {
  if (!isElectron) return
  remote.getCurrentWindow().setAlwaysOnTop(alwaysOnTop)
}

export const quit = () => {
  if (!isElectron) return
  remote.app.quit()
}

export const isFullScreen = () => {
  if (!isElectron) return false
  const win = remote.getCurrentWindow()
  return win.isSimpleFullScreen()
}

export const setFullScreen = (status: boolean) => {
  if (!isElectron) return
  const win = remote.getCurrentWindow()
  win.setSimpleFullScreen(status)
}

export const copyAllAsMarkdown = (state: EditorState) => {
  const text = markdownSerializer.serialize(state.doc)
  if (isElectron) {
    electron.clipboard.writeText(text)
  } else {
    navigator.clipboard.writeText(text)
  }
}

export const getVersion = () => {
  if (isElectron) {
    return electron.remote.app.getVersion()
  }

  return (window as any).process?.env.npm_package_version
}

export const getVersionUrl = () =>
  `https://github.com/dennis84/tiny-write/releases/tag/v${getVersionUrl()}`
