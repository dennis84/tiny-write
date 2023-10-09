import {DBSchema, openDB} from 'idb'
import {Camera, Config, ElementType, Mode, Window} from './state'

export interface PersistedVersion {
  ydoc: Uint8Array;
  date: Date;
}

export interface PersistedFile {
  id: string;
  ydoc: Uint8Array;
  versions?: PersistedVersion[];
  lastModified: Date;
  path?: string;
  markdown?: boolean;
  active?: boolean;
}

export interface PersistedCanvasElement {
  type: ElementType;
}

export interface PersistedCanvas {
  id: string;
  camera: Camera;
  elements: PersistedCanvasElement[];
  active?: boolean;
  lastModified?: Date;
}

interface Meta {
  mode: Mode;
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
  size: {
    key: string;
    value: number;
  };
  meta: {
    key: string;
    value: Meta;
  };
}

const DB_NAME = 'keyval'

const dbPromise = openDB<MyDB>(DB_NAME, 1, {
  upgrade(db: any) {
    db.createObjectStore('config')
    db.createObjectStore('window')
    db.createObjectStore('canvases', {keyPath: 'id'})
    db.createObjectStore('files', {keyPath: 'id'})
    db.createObjectStore('size')
    db.createObjectStore('meta')
  }
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
    return (await dbPromise).delete('files', id)
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
    return (await dbPromise).delete('canvases', id)
  }

  static async setSize(key: string, value: number) {
    return (await dbPromise).put('size', value, key)
  }

  static async getSize() {
    const db = await dbPromise
    const sizes = await db.getAll('size') ?? []
    return sizes.reduce((a, b) => (a ?? 0) + (b ?? 0), 0)
  }

  static async deleteDatabase() {
    indexedDB.deleteDatabase(DB_NAME)
  }
}
