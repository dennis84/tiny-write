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
