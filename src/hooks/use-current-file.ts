import {type Accessor, createMemo} from 'solid-js'
import {type File, Page, useState} from '@/state'

export const useCurrentFile = (): Accessor<File | undefined> => {
  const {store, canvasService, fileService} = useState()

  return createMemo(() => {
    const page = store.location?.page

    if (page === Page.Code || page === Page.Editor) {
      return fileService.currentFile
    }

    if (page === Page.Canvas) {
      const elementId = canvasService.currentCanvas?.elements.find((el) => el.selected)?.id
      return elementId ? fileService.findFileById(elementId) : undefined
    }

    return undefined
  })
}
