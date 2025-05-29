import {Accessor, createEffect, createSignal} from 'solid-js'
import {File, Page, useState} from '@/state'
import {useCurrentPage} from './current-page'

export const useCurrentFile = (): Accessor<File | undefined> => {
  const [currentFile, setCurrentFile] = createSignal<File>()
  const {canvasService, fileService} = useState()
  const currentPage = useCurrentPage()

  createEffect(() => {
    const page = currentPage()

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
