import {fetch as fetchTauri} from '@tauri-apps/plugin-http'
import {isTauri} from '@/env'

export const fetch = isTauri() ? fetchTauri : window.fetch
