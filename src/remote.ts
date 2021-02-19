import {EditorState} from 'prosemirror-state'
import FileType from 'file-type'
import {markdownSerializer} from './markdown'
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

export const fileExists = (src) => {
  if (!isElectron) return false
  const fs = (window as any).require?.('fs')
  const os = (window as any).require?.('os')
  const file = src.replace('~', os.homedir())
  return fs.existsSync(file)
}

export const readFile = async (src) => {
  if (!isElectron) return
  const fs = (window as any).require?.('fs')
  const os = (window as any).require?.('os')
  const file = src.replace('~', os.homedir())
  const buffer = fs.readFileSync(file)
  const meta = await FileType.fromBuffer(buffer)
  return {...meta, buffer, file}
}

export const writeFile = async (file, content) => {
  if (!isElectron) return
  const fs = (window as any).require?.('fs')
  if (fs.existsSync(file)) {
    fs.writeFileSync(file, content)
  }
}
