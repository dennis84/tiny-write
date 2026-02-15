import {type Accessor, createMemo} from 'solid-js'
import {useState} from '@/state'
import {type File, Page} from '@/types'

export const useCurrentFile = (): Accessor<File | undefined> => {
  const {locationService, canvasService, fileService} = useState()

  return createMemo(() => {
    const page = locationService.page

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
