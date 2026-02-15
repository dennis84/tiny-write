import {useLocation, useNavigate} from '@solidjs/router'
import {isTauri} from '../env'
import {open as shellOpen} from '../remote/app'
import {info} from '../remote/log'
import {isCanvas, isCodeElement, isCodeFile, isEditorElement, isFile} from '../state'
import type {Canvas, CanvasElement, File, LocationState, Page} from '../types'

export const useOpen = () => {
  const navigate = useNavigate()
  const location = useLocation<LocationState>()

  const updateState = (locState: Partial<LocationState> | undefined) => {
    const state = {...location.state, ...locState}
    navigate(location.pathname, {state, replace: true})
  }

  const openFile = (file?: File | Canvas | CanvasElement, locState?: Partial<LocationState>) => {
    if (!file) return navigate('/')
    const state = {...location.state, ...locState}

    if (isCodeFile(file)) {
      const newFile = file.newFile
      return navigate(`/code/${file.id}`, {state: {...state, newFile}})
    } else if (isFile(file)) {
      const newFile = file.newFile
      return navigate(`/editor/${file.id}`, {state: {...state, newFile}})
    } else if (isCanvas(file)) {
      return navigate(`/canvas/${file.id}`, {state})
    } else if (isEditorElement(file)) {
      return navigate(`/editor/${file.id}`, {state})
    } else if (isCodeElement(file)) {
      return navigate(`/code/${file.id}`, {state})
    }
  }

  const openPage = (page: Page, locState?: Partial<LocationState>) => {
    info(`Open page (page=${page})`)
    const state = {...location.state, ...locState}
    navigate(`/${page}`, {state})
  }

  const openDir = (path?: string[]) => {
    info(`Open dir (path=${path})`)
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

  return {openPage, openFile, openDir, openUrl, updateState}
}
