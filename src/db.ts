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
  deletedCanvases: {
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
  deletedFiles: {
    key: string;
    value: PersistedFile;
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
    db.createObjectStore('deletedCanvases', {keyPath: 'id'})
    db.createObjectStore('files', {keyPath: 'id'})
    db.createObjectStore('deletedFiles', {keyPath: 'id'})
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
    const db = await dbPromise
    const file = await db.get('files', id)
    if (file) {
      await db.put('deletedFiles', file)
    }

    return db.delete('files', id)
  }

  static async getDeletedFiles() {
    return (await dbPromise).getAll('deletedFiles')
  }

  static async deleteDeletedFile(id: string) {
    return (await dbPromise).delete('deletedFiles', id)
  }

  static async restoreFile(id: string): Promise<PersistedFile | undefined> {
    const db = await dbPromise
    const file = await db.get('deletedFiles', id)
    if (file) {
      await db.put('files', file)
      await db.delete('deletedFiles', id)
      return file
    }
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
    const canvas = await db.get('canvases', id)
    if (canvas) {
      await db.put('deletedCanvases', canvas)
    }

    return db.delete('canvases', id)
  }

  static async getDeletedCanvases() {
    return (await dbPromise).getAll('deletedCanvases')
  }

  static async deleteDeletedCanvas(id: string) {
    return (await dbPromise).delete('deletedCanvases', id)
  }

  static async restoreCanvas(id: string): Promise<PersistedCanvas | undefined> {
    const db = await dbPromise
    const canvas = await db.get('deletedCanvases', id)
    if (canvas) {
      await db.put('canvases', canvas)
      await db.delete('deletedCanvases', id)
      return canvas
    }
  }

  static async cleanup() {
    const db = await dbPromise

    for (const c of await db.getAll('deletedCanvases')) {
      const days = differenceInDays(Date.now(), c.lastModified ?? 0)
      if (days > 14) {
        db.delete('deletedCanvases', c.id)
        remote.info('💥 Deleted 14 days old canvas from bin')
      }
    }

    for (const f of await db.getAll('deletedFiles')) {
      const days = differenceInDays(Date.now(), f.lastModified ?? 0)
      if (days > 14) {
        db.delete('deletedFiles', f.id)
        remote.info('💥 Deleted 14 days old file from bin')
      }
    }
  }

  static async deleteDatabase() {
    indexedDB.deleteDatabase(DB_NAME)
  }
}
