import {openDB} from 'idb'

const dbPromise = openDB('tiny_write', 2, {
  upgrade(db) {
    db.createObjectStore('keyval')
  },
})

export default {
  async get(key) {
    return (await dbPromise).get('keyval', key)
  },
  async set(key, val) {
    return (await dbPromise).put('keyval', val, key)
  },
  async delete(key) {
    return (await dbPromise).delete('keyval', key)
  },
  async clear() {
    return (await dbPromise).clear('keyval')
  },
  async keys() {
    return (await dbPromise).getAllKeys('keyval')
  },
}
