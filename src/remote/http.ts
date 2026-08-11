import {isTauri} from '@/env'
import {fetch as fetchTauri} from '@tauri-apps/plugin-http'

export const fetch = isTauri() ? fetchTauri : window.fetch
