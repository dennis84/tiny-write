import {invoke} from '@tauri-apps/api/core'
import * as fs from '@tauri-apps/plugin-fs'
import * as dialog from '@tauri-apps/plugin-dialog'
import type {File} from '@/state'
import {serialize} from '@/markdown'
import {isTauri} from '@/env'
import {debug} from './log'

interface Document {
  path: string
  worktreePath?: string
  language?: string
  lastModified: Date
  version: number
}

export const getMimeType = async (path: string): Promise<string> => {
  return invoke('get_mime_type', {path})
}

export const readBinaryFile = async (path: string): Promise<Uint8Array> => {
  return fs.readFile(path)
}

export const readText = async (path: string): Promise<string> => {
  return invoke('read_text', {path})
}

export const replaceText = async (path: string, data: any): Promise<void> => {
  return await invoke('replace_text', {path, data})
}

export const writeFile = async (path: string): Promise<void> => {
  return await invoke('write_file', {path})
}

export const insertText = async (path: string, data: any) => {
  return await invoke('insert_text', {path, data})
}

export const deleteText = async (path: string, data: any) => {
  return await invoke('delete_text', {path, data})
}

export const getDocument = async (path: string): Promise<Document> => {
  return invoke('get_document', {path})
}

export const resolvePath = async (
  path: string,
  basePath: string | undefined = undefined,
): Promise<string> => {
  debug(`Resolve paths (path=${path}, basePath=${basePath})`)
  return invoke('resolve_path', {path, basePath})
}

export const dirname = async (path: string): Promise<string> => {
  return invoke('dirname', {path})
}

export const toRelativePath = async (path: string, basePath?: string): Promise<string> => {
  if (!isTauri()) return path
  return invoke('to_relative_path', {path, basePath})
}

export const toAbsolutePath = async (path: string, basePath?: string): Promise<string> => {
  return invoke('to_absolute_path', {path, basePath})
}

export const listContents = async (path: string, basePath: string | undefined = undefined) => {
  return (await invoke('list_contents', {path, basePath})) as string[]
}

export const saveFile = async (file: File): Promise<string> => {
  const path = await dialog.save({defaultPath: file.newFile})
  if (!path) throw new Error('No path returned')
  if (file.editorView?.state) {
    await replaceText(path, {text: serialize(file.editorView.state)})
  } else if (file.codeEditorView) {
    await replaceText(path, {text: file.codeEditorView.state.doc.toString()})
  }

  return path
}
