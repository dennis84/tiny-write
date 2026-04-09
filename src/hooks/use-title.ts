import {createScheduled, debounce, leadingAndTrailing} from '@solid-primitives/scheduled'
import {createMemo, createResource, type Resource} from 'solid-js'
import {isCanvas, isDirectory, isFile, isFilename, isProject, useState} from '@/state'
import type {MenuItem} from '@/types'

interface Props {
  item?: MenuItem
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
    if (isFile(item) && item.code) return `file:${item.id}:${item.title}:${item.path}`
    else if (isFile(item)) return `file:${item.id}:${item.title ?? item.lastModified}`
    else if (isCanvas(item)) return `canvas:${item.id}:${item.title ?? ''}`
    else if (isProject(item)) return `project:${item.id}:${item.name}`
    else if (isFilename(item)) return `filename:${item.id}`
    else if (isDirectory(item)) return `directory:${item.id}`
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
    } else if (isCanvas(item)) {
      return item.title ?? (props?.fallback !== false ? 'Canvas' : undefined)
    } else if (isProject(item)) {
      return item.name
    } else if (isFilename(item)) {
      return item.name
    } else if (isDirectory(item)) {
      return item.name
    }
  })

  return title
}
