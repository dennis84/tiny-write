import {currentMonitor, getCurrentWindow, PhysicalPosition, PhysicalSize} from '@tauri-apps/api/window'
import {invoke} from '@tauri-apps/api/core'
import * as clipboard from '@tauri-apps/plugin-clipboard-manager'
import * as fs from '@tauri-apps/plugin-fs'
import * as logger from '@tauri-apps/plugin-log'
import * as dialog from '@tauri-apps/plugin-dialog'
import * as shell from '@tauri-apps/plugin-shell'
import {EditorState} from 'prosemirror-state'
import {toBase64} from 'js-base64'
import {Args, File, Window} from '@/state'
import {serialize} from '@/markdown'
import {isTauri} from '@/env'

export const saveSvg = async (svg: HTMLElement) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const rect = svg.getBoundingClientRect()
  const ratio = rect.height / rect.width
  canvas.width = 1080
  canvas.height = 1080 * ratio
  ctx.fillStyle = 'transparent'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const image = new Image()
  const svgString = svg.outerHTML
    .replaceAll('<br>', '<br/>')
    .replaceAll(/<img([^>]*)>/g, (_, g: string) => `<img ${g} />`)
  image.src = `data:image/svg+xml;base64,${toBase64(svgString)}`
  await image.decode()

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  canvas.toBlob(async (blob) => {
    if (!blob) return

    const filename = 'mermaid-graph.png'
    if (isTauri()) {
      const path = await dialog.save({defaultPath: `./${filename}`})
      if (!path) return
      const buffer = await blob.arrayBuffer()
      const contents = new Uint8Array(buffer)
      await fs.writeFile(path, contents)
      return
    }

    const downloadLink = document.createElement('a')
    downloadLink.setAttribute('download', filename)
    const url = URL.createObjectURL(blob)
    downloadLink.setAttribute('href', url)
    downloadLink.click()
  })
}

export const getArgs = async (): Promise<Args> => {
  if (!isTauri()) throw Error('Must be run in tauri')
  return await invoke('get_args')
}

export const setAlwaysOnTop = (alwaysOnTop: boolean): Promise<void> => {
  if (!isTauri()) throw Error('Must be run in tauri')
  return getCurrentWindow().setAlwaysOnTop(alwaysOnTop)
}

export const quit = (): Promise<void> => {
  if (!isTauri()) throw Error('Must be run in tauri')
  return getCurrentWindow().close()
}

export const isFullscreen = (): Promise<boolean> => {
  if (!isTauri()) throw Error('Must be run in tauri')
  return getCurrentWindow().isFullscreen()
}

export const setFullscreen = (status: boolean): Promise<void> => {
  if (!isTauri()) throw Error('Must be run in tauri')
  return getCurrentWindow().setFullscreen(status)
}

export const copy = async (text: string): Promise<void> => {
  if (isTauri()) {
    return clipboard.writeText(text)
  } else {
    await navigator.clipboard.writeText(text)
  }
}

export const copyAllAsMarkdown = async (state: EditorState): Promise<void> => {
  const text = serialize(state)
  if (isTauri()) {
    return clipboard.writeText(text)
  } else {
    await navigator.clipboard.writeText(text)
  }
}

export const getMimeType = async (path: string): Promise<string> => {
  if (!isTauri()) throw Error('Must be run in tauri: getMimeType')
  return invoke('get_mime_type', {path})
}

export const getFileLastModified = async (path: string): Promise<Date> => {
  if (!isTauri()) throw Error('Must be run in tauri: getFileLastModified')
  const ts = (await invoke('get_file_last_modified', {path})) as string
  return new Date(ts)
}

export const readFile = async (path: string): Promise<string> => {
  if (!isTauri()) throw Error('Must be run in tauri: readFile')
  return fs.readTextFile(path)
}

export const readBinaryFile = async (path: string): Promise<Uint8Array> => {
  if (!isTauri()) throw Error('Must be run in tauri: readBinaryFile')
  return fs.readFile(path)
}

export const writeFile = async (path: string, contents: string): Promise<void> => {
  if (!isTauri()) throw Error('Must be run in tauri: writeFile')
  return fs.writeTextFile(path, contents)
}

export const resolvePath = async (path: string, basePath: string | undefined = undefined): Promise<string> => {
  if (!isTauri()) throw Error('Must be run in tauri: resolvePath')
  debug(`Resolve paths (path=${path}, basePath=${basePath})`)
  return invoke('resolve_path', {path, basePath})
}

export const dirname = async (path: string): Promise<string> => {
  if (!isTauri()) throw Error('Must be run in tauri: dirname')
  return invoke('dirname', {path})
}

export const toRelativePath = async (path: string, basePath?: string): Promise<string> => {
  if (!isTauri()) throw Error('Must be run in tauri: toRelativePath')
  return invoke('to_relative_path', {path, basePath})
}

export const listContents = async (path: string, basePath: string | undefined = undefined) => {
  if (!isTauri()) throw Error('Must be run in tauri: listContents')
  return (await invoke('list_contents', {path, basePath})) as string[]
}

export const saveFile = async (file: File): Promise<string> => {
  if (!isTauri()) throw Error('Must be run in tauri: save')
  const path = await dialog.save({defaultPath: file.newFile})
  if (!path) throw new Error('No path returned')
  if (!file.editorView?.state) throw new Error('EditorView is not defined')
  await fs.writeTextFile(path, serialize(file.editorView.state))
  return path
}

export const debug = (msg: string, ...data: any[]) => {
  if (isTauri()) void logger.debug(msg)
  console.debug(msg, ...data)
}

export const info = (msg: string, ...data: any[]) => {
  if (isTauri()) void logger.info(msg)
  console.info(msg, ...data)
}

export const warn = (msg: string, ...data: any[]) => {
  if (isTauri()) void logger.warn(msg)
  console.warn(msg, ...data)
}

export const error = (msg: string, ...data: any[]) => {
  if (isTauri()) void logger.error(msg)
  console.error(msg, ...data)
}

export const updateWindow = async ({width, height, x, y}: Window) => {
  if (!isTauri()) throw Error('Must be run in tauri: save')
  info(`Update window: (width=${width}, height=${height}, x=${x}, y=${y})`)

  // Last size should not be too small, otherwise difficult to enlarge.
  if (width > 10 && height > 10) {
    await getCurrentWindow().setSize(new PhysicalSize(width, height))
  }

  const size = await getCurrentWindow().outerSize()
  const monitor = await currentMonitor()
  if (!monitor) return

  // Last pos must fit in current screen size.
  if (x >= 0 && x < monitor.size.width - size.width && y >= 0 && y < monitor.size.height - size.height) {
    await getCurrentWindow().setPosition(new PhysicalPosition(x, y))
  }
}

export const show = async () => {
  if (!isTauri()) throw Error('Must be run in tauri: show')
  return await invoke('show_main_window')
}

export const open = async (href: string) => {
  info(`Open link: (href=${href})`)
  if (!isTauri()) {
    window.open(href, '_blank')
    return
  }

  await shell.open(href)
}
