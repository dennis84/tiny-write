import {markdownSerializer} from './markdown'
import {EditorState} from 'prosemirror-state'
import {isElectron} from './env'

export const setAlwaysOnTop = (alwaysOnTop) => {
  if (!isElectron) return
  const remote = window.require('electron').remote
  remote.getCurrentWindow().setAlwaysOnTop(alwaysOnTop)
}

export const quit = () => {
  if (!isElectron) return
  const remote = window.require('electron').remote
  remote.app.quit()
}

export const isFullScreen = () => {
  if (!isElectron) return false
  const remote = window.require('electron').remote
  const win = remote.getCurrentWindow()
  return win.isSimpleFullScreen()
}

export const setFullScreen = (status: boolean) => {
  if (!isElectron) return
  const remote = window.require('electron').remote
  const win = remote.getCurrentWindow()
  win.setSimpleFullScreen(status)
}

export const copyAllAsMarkdown = (state: EditorState) => {
  const text = markdownSerializer.serialize(state.doc)
  if (isElectron) {
    const electron = window.require('electron')
    electron.clipboard.writeText(text)
  } else {
    navigator.clipboard.writeText(text)
  }
}

export const getVersion = () => {
  if (isElectron) {
    const electron = window.require('electron')
    return electron.remote.app.getVersion()
  }

  return process.env.npm_package_version
}

export const getVersionUrl = () =>
  `https://github.com/dennis84/tiny-write/releases/tag/v${getVersionUrl()}`
