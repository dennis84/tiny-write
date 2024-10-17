import {useLocation, useNavigate} from '@solidjs/router'
import {
  CanvasElement,
  ElementType,
  isCodeElement,
  isCodeFile,
  isEditorElement,
  isFile,
  Openable,
} from './state'
import {info} from './remote'

export const useOpen = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const isCanvasElement = (el: any): el is CanvasElement =>
    el.type === ElementType.Code ||
    el.type === ElementType.Link ||
    el.type === ElementType.Image ||
    el.type === ElementType.Video ||
    el.type === ElementType.Editor

  const open = (item: Openable | undefined, back = false) => {
    const prev = back ? location.pathname : undefined
    const state = {prev}

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

  return {open, openDir}
}
