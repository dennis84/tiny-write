import {fromUint8Array, toUint8Array} from 'js-base64'
import * as remote from '@/remote'
import * as db from '@/db'
import {File, State} from '@/state'
import {isTauri} from '@/env'
import {serialize} from '@/markdown'

const fetchFiles = async () => {
  const fetched = await db.getFiles()
  const files = []

  for (const file of fetched ?? []) {
    try {
      files.push({
        id: file.id,
        ydoc: toUint8Array(file.ydoc),
        lastModified: new Date(file.lastModified),
        path: file.path,
        markdown: file.markdown,
      })
    } catch (err) {
      remote.log('ERROR', 'Ignore file due to invalid ydoc.')
    }
  }

  return files
}

export const fetchData = async (state: State): Promise<State> => {
  let args = await remote.getArgs().catch(() => undefined)

  if (!isTauri) {
    const room = window.location.pathname?.slice(1).trim()
    if (room) args = {room}
  }

  const fetchedEditor = await db.getEditor()
  const fetchedWindow = await db.getWindow()
  const fetchedConfig = await db.getConfig()
  const fetchedSize = await db.getSize()
  const files = await fetchFiles()

  const config = {
    ...state.config,
    ...fetchedConfig,
  }

  return {
    ...state,
    args: args ?? state.args,
    editor: fetchedEditor,
    files,
    config,
    window: fetchedWindow,
    storageSize: fetchedSize ?? 0,
    collab: undefined,
  }
}

export const saveConfig = async (state: State) => {
  db.setConfig(state.config)
  db.setSize('window', JSON.stringify(state.config).length)
  remote.log('info', '💾 Save config')
}

export const saveWindow = async (state: State) => {
  if (!state.window) return
  db.setWindow(state.window)
  db.setSize('window', JSON.stringify(state.window).length)
  remote.log('info', '💾 Save window state')
}

export const saveFile = async (file: File) => {
  if (!file.lastModified) {
    return
  }

  db.updateFile({
    id: file.id,
    ydoc: fromUint8Array(file.ydoc!),
    lastModified: file.lastModified,
    path: file.path,
    markdown: file.markdown,
  })

  const files = await db.getFiles() ?? []
  db.setSize('files', JSON.stringify(files).length)
}

export const saveEditor = async (state: State) => {
  if (!state.editor?.id || !state.editor?.editorView) {
    return
  }

  const editor = {id: state.editor.id}
  const file = state.files.find((f) => f.id === editor.id)
  if (!file) return
  saveFile(file)

  if (state.editor?.path) {
    const text = serialize(state.editor.editorView.state)
    await remote.writeFile(state.editor.path, text)
  }

  db.setEditor(editor)
}

export const reset = () => db.deleteDatabase()
