import {Accessor, createEffect, createSignal} from 'solid-js'
import {File, Page, useState} from '@/state'

export const useCurrentFile = (): Accessor<File | undefined> => {
  const [currentFile, setCurrentFile] = createSignal<File>()
  const {store, canvasService, fileService} = useState()

  createEffect(() => {
    const page = store.lastLocation?.page

    if (page === Page.Code || page === Page.Editor) {
      setCurrentFile(fileService.currentFile)
    } else if (page === Page.Canvas) {
      const elementId = canvasService.currentCanvas?.elements.find((el) => el.selected)?.id
      if (elementId) setCurrentFile(fileService.findFileById(elementId))
      else setCurrentFile(undefined)
    } else {
      setCurrentFile(undefined)
    }
  })

  return currentFile
}
