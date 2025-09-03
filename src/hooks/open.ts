import {useLocation, useNavigate} from '@solidjs/router'
import {isTauri} from '../env'
import {open as shellOpen} from '../remote/app'
import {info} from '../remote/log'
import {
  type Canvas,
  type File,
  isCodeFile,
  isFile,
  type LocationState,
  Page,
  useState,
} from '../state'

export const useOpen = () => {
  const navigate = useNavigate()
  const location = useLocation<LocationState>()
  const {store} = useState()

  const openFile = (file?: File | Canvas, locState?: Partial<LocationState>) => {
    if (!file) return open(undefined)

    if (isCodeFile(file)) {
      const newFile = file.newFile
      return open({...locState, codeId: file.id, newFile})
    } else if (isFile(file)) {
      const newFile = file.newFile
      return open({...locState, editorId: file.id, newFile})
    } else {
      return open({...locState, canvasId: file.id})
    }
  }

  const open = (locState?: Partial<LocationState>) => {
    if (!locState) {
      info(`Redirect to (to=/)`)
      return navigate('/')
    }

    const prev = location.pathname

    const threadId = store.location?.threadId // keep threadId to keep assistant open
    let page = locState.page
    let id: string | undefined

    if (locState.editorId) {
      page = Page.Editor
      id = locState.editorId
    } else if (locState.codeId) {
      page = Page.Code
      id = locState.codeId
    } else if (locState.canvasId) {
      page = Page.Canvas
      id = locState.canvasId
    } else if (locState.threadId) {
      page = Page.Assistant
      id = locState.threadId
    }

    const state = {
      prev,
      page,
      threadId,
      ...locState,
    }

    if (!id) {
      info(`Redirect to (to=/${page})`)
      return navigate(`/${page}`, {state})
    }

    info(`Redirect to (to=/${page}/${id})`)
    return navigate(`/${page}/${id}`, {state})
  }

  const openDir = (path?: string[]) => {
    info(`Redirect to (to=/dir)`)
    const state = {path}
    navigate('/dir', {state})
  }

  const openUrl = async (url: string) => {
    info(`Open url (url=${url})`)

    if (isTauri()) {
      await shellOpen(url)
      return
    }

    window.open(url, '_blank')
  }

  return {open, openFile, openDir, openUrl}
}
