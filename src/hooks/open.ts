import {useLocation, useNavigate} from '@solidjs/router'
import {isTauri} from '../env'
import {open as shellOpen} from '../remote/app'
import {info} from '../remote/log'
import {
  type CanvasElement,
  ElementType,
  isCodeElement,
  isCodeFile,
  isEditorElement,
  isFile,
  type MergeState,
  type Openable,
  useState,
  type VisualPositionRange,
} from '../state'

interface OpenOptions {
  back?: boolean
  selection?: VisualPositionRange
  merge?: MergeState
  threadId?: string
}

export const useOpen = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {store} = useState()

  const isCanvasElement = (el: any): el is CanvasElement =>
    el.type === ElementType.Code ||
    el.type === ElementType.Link ||
    el.type === ElementType.Image ||
    el.type === ElementType.Video ||
    el.type === ElementType.Editor

  const open = (item: Openable | undefined, options?: OpenOptions) => {
    if (!item) return

    const prev = options?.back ? location.pathname : undefined
    const file = isFile(item) ? item.path : undefined
    const newFile = isFile(item) ? item.newFile : undefined
    // store threadId in location state to keep assistant open
    const threadId = options?.threadId ?? store?.lastLocation?.threadId

    const state = {
      prev,
      file,
      newFile,
      selection: options?.selection,
      merge: options?.merge,
      threadId,
    }

    if (item === '/') {
      info(`Redirect to (to=/)`)
      return navigate('/', {state})
    } else if (isCodeFile(item)) {
      info(`Redirect to (to=/code/${item.id})`)
      navigate(`/code/${item.id}`, {state})
    } else if (isFile(item)) {
      info(`Redirect to (to=/editor/${item.id})`)
      navigate(`/editor/${item.id}`, {state})
    } else if (isCanvasElement(item) && isEditorElement(item)) {
      navigate(`/editor/${item.id}`, {state})
    } else if (isCanvasElement(item) && isCodeElement(item)) {
      navigate(`/code/${item.id}`, {state})
    } else {
      info(`Redirect to (to=/canvas/${item.id})`)
      navigate(`/canvas/${item.id}`, {state})
    }
  }

  const openDir = (path?: string[]) => {
    info(`Redirect to (to=/dir)`)
    const state = {path}
    navigate('/dir', {state})
  }

  const openUrl = async (url: string) => {
    info(`Open url (url=${url})`)

    if (url.startsWith('/')) {
      const prev = location.pathname
      const state = {prev}
      return navigate(url, {state})
    }

    if (isTauri()) {
      await shellOpen(url)
      return
    }

    window.open(url, '_blank')
  }

  return {open, openDir, openUrl}
}
