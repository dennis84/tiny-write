import {fetch as fetchTauri} from '@tauri-apps/plugin-http'
import {isTauri} from '@/env'

// check tauri mode at call time for fetch-mock
export const fetch: typeof globalThis.fetch = (input, init) =>
  isTauri() ? fetchTauri(input, init) : globalThis.fetch(input, init)
