import {EditorState} from 'prosemirror-state'
import {serialize} from './markdown'
import {isElectron} from './env'

export const on = (name: string, fn: (...args: any) => void) => {
  if (!isElectron) return
  window.app.on(name, fn)
}

export const getArgs = () => {
  if (!isElectron) return
  return window.app.getArgs()
}

export const setAlwaysOnTop = (alwaysOnTop: boolean) => {
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
  const text = serialize(state)
  if (isElectron) {
    return window.app.copyToClipboard(text)
  } else {
    navigator.clipboard.writeText(text)
  }
}

export const fileExists = async (src: string) => {
  if (!isElectron) return false
  return window.app.fileExists(src)
}

export const isImage = async (src: string) => {
  if (!isElectron) return false
  return window.app.isImage(src)
}

export const readFile = async (src: string) => {
  if (!isElectron) return
  return window.app.readFile(src)
}

export const writeFile = async (file: string, content: string) => {
  if (!isElectron) return
  return window.app.writeFile(file, content)
}

export const resolve = async (base: string, src: string) => {
  if (!isElectron) return src
  return window.app.resolve(base, src)
}

export const log = async (...args: any) => {
  if (!isElectron) return
  return window.app.log(...args)
}

export const save = async (state: EditorState) => {
  if (!isElectron) return
  return window.app.save(serialize(state))
}
