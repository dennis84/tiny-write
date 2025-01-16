import {invoke} from '@tauri-apps/api/core'
import {isTauri} from '@/env'

export const debug = (message: string, ...data: any[]) => {
  if (isTauri()) void invoke('log_debug', {message})
  console.debug(message, ...data)
}

export const info = (message: string, ...data: any[]) => {
  if (isTauri()) void invoke('log_info', {message})
  console.info(message, ...data)
}

export const warn = (message: string, ...data: any[]) => {
  if (isTauri()) void invoke('log_warn', {message})
  console.warn(message, ...data)
}

export const error = (message: string, ...data: any[]) => {
  if (isTauri()) void invoke('log_error', {message})
  console.error(message, ...data)
}

export const span = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  if (!isTauri()) {
    return await fn()
  }
  const rid = await invoke('log_span_start', {name})
  try {
    return await fn()
  } finally {
    await invoke('log_span_end', {rid})
  }
}
