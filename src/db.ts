import {DBSchema, openDB} from 'idb'
import {Config, Window} from './state';

export interface PersistedFile {
  id: string;
  ydoc: string;
  lastModified: Date;
  path?: string;
  markdown?: boolean;
}

export interface PersistedEditor {
  id: string;
}

interface MyDB extends DBSchema {
  config: {
    key: string;
    value: Config;
  };
  editor: {
    key: string;
    value: PersistedEditor;
  };
  window: {
    key: string;
    value: Window;
  };
  files: {
    key: string;
    value: PersistedFile;
  };
  size: {
    key: string;
    value: number;
  };
}

const DB_NAME = 'keyval'

const dbPromise = openDB<MyDB>(DB_NAME, 1, {
  upgrade(db: any) {
    db.createObjectStore('config')
    db.createObjectStore('editor')
    db.createObjectStore('window')
    db.createObjectStore('files', {keyPath: 'id'})
    db.createObjectStore('size')
  }
})

export async function setConfig(config: Config) {
  return (await dbPromise).put('config', config, 'main')
}

export async function getConfig() {
  return (await dbPromise).get('config', 'main')
}

export async function setEditor(editor: PersistedEditor) {
  return (await dbPromise).put('editor', editor, 'main')
}

export async function getEditor() {
  return (await dbPromise).get('editor', 'main')
}

export async function setWindow(window: Window) {
  return (await dbPromise).put('window', window, 'main')
}

export async function getWindow() {
  return (await dbPromise).get('window', 'main')
}

export async function getFiles() {
  return (await dbPromise).getAll('files')
}

export async function updateFile(file: PersistedFile) {
  const db = await dbPromise
  const existing = await db.get('files', file.id)
  if (existing) {
    await db.put('files', file)
    return
  }

  await db.add('files', file)
}

export async function deleteFile(id: string) {
  return (await dbPromise).delete('files', id)
}

export async function setSize(key: string, value: number) {
  return (await dbPromise).put('size', value, key)
}

export async function getSize() {
  const db = await dbPromise
  const sizes = await db.getAll('size') ?? []
  return sizes.reduce((a, b) => (a ?? 0) + (b ?? 0), 0)
}

export async function deleteDatabase() {
  indexedDB.deleteDatabase(DB_NAME)
}
