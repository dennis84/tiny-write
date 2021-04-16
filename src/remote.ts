import {EditorState} from 'prosemirror-state'
import {markdownSerializer} from './markdown'
import {isElectron} from './env'

export const getArgs = () => {
  if (!isElectron) return
  return window.app.getArgs()
}

export const setAlwaysOnTop = (alwaysOnTop) => {
  if (!isElectron) return
  return window.app.setAlwaysOnTop(alwaysOnTop)
}

export const quit = () => {
  if (!isElectron) return
  return window.app.quit()
}

export const isFullscreen = () => {
  if (!isElectron) return false
  return window.app.isSimpleFullScreen()
}

export const setFullscreen = (status: boolean) => {
  if (!isElectron) return
  return window.app.setSimpleFullScreen(status)
}

export const copy = async (text: string) => {
  if (isElectron) {
    return window.app.copyToClipboard(text)
  } else {
    navigator.clipboard.writeText(text)
  }
}

export const copyAllAsMarkdown = async (state: EditorState) => {
  const text = markdownSerializer.serialize(state.doc)
  if (isElectron) {
    return window.app.copyToClipboard(text)
  } else {
    navigator.clipboard.writeText(text)
  }
}

export const fileExists = async (src) => {
  if (!isElectron) return false
  return window.app.fileExists(src)
}

export const readFile = async (src) => {
  if (!isElectron) return
  return window.app.readFile(src)
}

export const writeFile = async (file, content) => {
  if (!isElectron) return
  return window.app.writeFile(file, content)
}

export const resolve = async (base, ...paths) => {
  if (!isElectron) return
  return window.app.resolve(base, ...paths)
}

export const log = async (...args) => {
  if (!isElectron) return
  return window.app.log(...args)
}
