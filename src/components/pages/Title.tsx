import {createEffect} from 'solid-js'
import {Mode, useState} from '@/state'

export const Title = () => {
  const {store, canvasService, fileService} = useState()

  createEffect(async () => {
    if (store.mode === Mode.Canvas) {
      const currentCanvas = canvasService.currentCanvas
      document.title = currentCanvas?.title ?? 'Canvas'
    } else {
      document.title = await fileService.getTitle(fileService.currentFile)
    }
  })

  return <></>
}
