import {onMount} from 'solid-js'
import {useLocation} from '@solidjs/router'
import {LocationState, Mode, useState} from '@/state'
import {info} from '@/remote/log'
import {useOpen} from '@/open'

export const Redirect = () => {
  const {store, canvasService, fileService} = useState()
  const {open, openDir} = useOpen()
  const location = useLocation<LocationState>()

  onMount(async () => {
    const path = location.state?.file ?? store.args?.file
    const newFile = location.state?.newFile ?? store.args?.newFile
    const argPath = newFile ?? path
    const back = !!location.state?.prev
    const selection = location.state?.selection

    if (store.args?.source && !argPath) {
      openDir()
      return
    }

    if (argPath) {
      let file = await fileService.newFileByPath(path, newFile)
      return open(file, back, selection)
    }

    if (store.mode === Mode.Editor && fileService.currentFile) {
      return open(fileService.currentFile, back, selection)
    }

    if (store.mode === Mode.Code && fileService.currentFile) {
      return open(fileService.currentFile, back, selection)
    }

    if (store.mode === Mode.Canvas && canvasService.currentCanvas) {
      return open(canvasService.currentCanvas, back, selection)
    }

    const first = store.files.find((f) => !f.deleted)
    if (first) {
      return open(first, back, selection)
    }

    const file = await fileService.newFile()
    info(`Created new file (id=${file.id})`)
    open(file, back, selection)
  })

  return <></>
}
