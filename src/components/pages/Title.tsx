import {createEffect} from 'solid-js'
import {Page, useState} from '@/state'

export const Title = () => {
  const {store, canvasService, fileService} = useState()

  createEffect(async () => {
    if (store.location?.page === Page.Canvas) {
      const currentCanvas = canvasService.currentCanvas
      document.title = currentCanvas?.title ?? 'Canvas'
    } else {
      document.title = (await fileService.getTitle(fileService.currentFile)) ?? ''
    }
  })

  return null
}
