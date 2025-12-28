import {createScheduled, debounce, leadingAndTrailing} from '@solid-primitives/scheduled'
import {createMemo, createResource, type Resource} from 'solid-js'
import {isCodeFile, isFile, useState} from '@/state'
import type {Canvas, File} from '@/types'

interface Props {
  item?: File | Canvas
  maxLength?: number
  fallback?: boolean
  useCurrent?: boolean
}

export const useTitle = (props?: Props): Resource<string | undefined> => {
  const {fileService, canvasService} = useState()

  const currentItem = () => {
    if (props?.useCurrent === false) return props?.item
    return props?.item ?? fileService.currentFile ?? canvasService.currentCanvas
  }

  const currentItemKey = () => {
    const item = currentItem()
    if (!item) return undefined
    if (isCodeFile(item)) return `file:${item.id}:${item.title}:${item.path}`
    else if (isFile(item)) return `file:${item.id}:${item.title ?? item.lastModified}`
    return `canvas:${item.id}:${item.title ?? ''}`
  }

  const scheduled = createScheduled((fn) => leadingAndTrailing(debounce, fn, 200))

  const deferredItemKey = createMemo(() => {
    if (scheduled()) return currentItemKey()
  })

  const [title] = createResource(deferredItemKey, async () => {
    const item = currentItem()
    if (!item) return undefined
    if (isFile(item)) {
      return await fileService.getTitle(item, props?.maxLength, props?.fallback)
    } else {
      return item.title ?? (props?.fallback !== false ? 'Canvas' : undefined)
    }
  })

  return title
}
