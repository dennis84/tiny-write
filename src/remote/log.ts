import * as logger from '@tauri-apps/plugin-log'
import {isTauri} from '@/env'

export const debug = (msg: string, ...data: any[]) => {
  if (isTauri()) void logger.debug(msg)
  console.debug(msg, ...data)
}

export const info = (msg: string, ...data: any[]) => {
  if (isTauri()) void logger.info(msg)
  console.info(msg, ...data)
}

export const warn = (msg: string, ...data: any[]) => {
  if (isTauri()) void logger.warn(msg)
  console.warn(msg, ...data)
}

export const error = (msg: string, ...data: any[]) => {
  if (isTauri()) void logger.error(msg)
  console.error(msg, ...data)
}
