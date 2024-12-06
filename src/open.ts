import {useLocation, useNavigate} from '@solidjs/router'
import {
  CanvasElement,
  ElementType,
  isCodeElement,
  isCodeFile,
  isEditorElement,
  isFile,
  Openable,
  VisualPositionRange,
} from './state'
import {info} from './remote/log'
import {open as shellOpen} from './remote/app'
import {isTauri} from './env'

export const useOpen = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const isCanvasElement = (el: any): el is CanvasElement =>
    el.type === ElementType.Code ||
    el.type === ElementType.Link ||
    el.type === ElementType.Image ||
    el.type === ElementType.Video ||
    el.type === ElementType.Editor

  const open = (
    item: Openable | undefined,
    back = false,
    selection: VisualPositionRange | undefined = undefined,
  ) => {
    const prev = back ? location.pathname : undefined
    const file = isFile(item) ? item.path : undefined
    const newFile = isFile(item) ? item.newFile : undefined
    const state = {prev, file, newFile, selection}

    if (!item) {
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
