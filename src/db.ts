import {openDB} from 'idb'

const dbPromise = openDB('tiny_write', 2, {
  upgrade(db) {
    db.createObjectStore('keyval')
  },
})

export const get = async (key: string) =>
  (await dbPromise).get('keyval', key)

export const set = async (key: string, val: string) =>
  (await dbPromise).put('keyval', val, key)

export const del = async (key: string) =>
  (await dbPromise).delete('keyval', key)

export const clear = async () =>
  (await dbPromise).clear('keyval')

export const keys = async () =>
  (await dbPromise).getAllKeys('keyval')
