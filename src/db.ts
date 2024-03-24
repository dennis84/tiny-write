import {DBSchema, openDB} from 'idb'
import {differenceInDays} from 'date-fns'
import {Camera, Config, ElementType, Mode, Window} from '@/state'
import * as remote from '@/remote'

export interface PersistedVersion {
  ydoc: Uint8Array;
  date: Date;
}

export interface PersistedFile {
  id: string;
  parentId?: string;
  leftId?: string;
  ydoc: Uint8Array;
  versions?: PersistedVersion[];
  lastModified: Date;
  path?: string;
  newFile?: string;
  markdown?: boolean;
  active?: boolean;
  deleted?: boolean;
}

export interface PersistedCanvasElement {
  type: ElementType;
}

export interface PersistedCanvas {
  id: string;
  parentId?: string;
  leftId?: string;
  camera: Camera;
  elements: PersistedCanvasElement[];
  active?: boolean;
  lastModified?: Date;
  deleted?: boolean;
}

interface Meta {
  mode: Mode;
}

interface Tree {
  collapsed: string[];
}

interface MyDB extends DBSchema {
  config: {
    key: string;
    value: Config;
  };
  canvases: {
    key: string;
    value: PersistedCanvas;
  };
  window: {
    key: string;
    value: Window;
  };
  files: {
    key: string;
    value: PersistedFile;
  };
  meta: {
    key: string;
    value: Meta;
  };
  tree: {
    key: string;
    value: Tree;
  };
}

const DB_NAME = 'tiny_write'

// Increment version and add new scheme:
// ```
// openDB(DB_NAME, 2, { ... })
//
// if (newVersion === 2) { db.createObjectStore(...) }
// ```
const dbPromise = openDB<MyDB>(DB_NAME, 1, {
  upgrade(db: any, oldVersion, newVersion) {
    remote.info(`Upgrade DB from version ${oldVersion} to ${newVersion}`)
    if (newVersion === 1) {
      db.createObjectStore('config')
      db.createObjectStore('window')
      db.createObjectStore('canvases', {keyPath: 'id'})
      db.createObjectStore('files', {keyPath: 'id'})
      db.createObjectStore('meta')
      db.createObjectStore('tree')
    }
  },
})

export class DB {
  static async setConfig(config: Config) {
    return (await dbPromise).put('config', config, 'main')
  }

  static async getConfig() {
    return (await dbPromise).get('config', 'main')
  }

  static async setWindow(window: Window) {
    return (await dbPromise).put('window', window, 'main')
  }

  static async getWindow() {
    return (await dbPromise).get('window', 'main')
  }

  static async setMeta(meta: Meta) {
    return (await dbPromise).put('meta', meta, 'main')
  }

  static async getMeta() {
    return (await dbPromise).get('meta', 'main')
  }

  static async setTree(tree: Tree) {
    return (await dbPromise).put('tree', tree, 'main')
  }

  static async getTree() {
    return (await dbPromise).get('tree', 'main')
  }

  static async getFiles() {
    return (await dbPromise).getAll('files')
  }

  static async updateFile(file: PersistedFile) {
    const db = await dbPromise
    const existing = await db.get('files', file.id)
    if (existing) {
      await db.put('files', file)
      return
    }

    await db.add('files', file)
  }

  static async deleteFile(id: string) {
    const db = await dbPromise
    return db.delete('files', id)
  }

  static async getCanvases(): Promise<PersistedCanvas[]> {
    return (await dbPromise).getAll('canvases')
  }

  static async updateCanvas(canvas: PersistedCanvas) {
    const db = await dbPromise
    const existing = await db.get('canvases', canvas.id)
    if (existing) {
      await db.put('canvases', canvas)
      return
    }

    await db.add('canvases', canvas)
  }

  static async deleteCanvas(id: string) {
    const db = await dbPromise
    return db.delete('canvases', id)
  }

  static async cleanup() {
    const db = await dbPromise

    for (const c of await db.getAll('canvases')) {
      if (!c.deleted) continue
      const days = differenceInDays(Date.now(), c.lastModified ?? 0)
      if (days > 14) {
        await db.delete('canvases', c.id)
        remote.info('💥 Deleted 14 days old canvas from bin')
      }
    }

    for (const f of await db.getAll('files')) {
      if (!f.deleted) continue
      const days = differenceInDays(Date.now(), f.lastModified ?? 0)
      if (days > 14) {
        await db.delete('files', f.id)
        remote.info('💥 Deleted 14 days old file from bin')
      }
    }
  }

  static async deleteDatabase() {
    indexedDB.deleteDatabase(DB_NAME)
  }
}
