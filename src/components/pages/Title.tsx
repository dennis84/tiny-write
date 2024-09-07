import {createEffect} from 'solid-js'
import {Mode, useState} from '@/state'

export const Title = () => {
  const [store, ctrl] = useState()

  createEffect(async () => {
    if (store.mode === Mode.Canvas) {
      const currentCanvas = ctrl.canvas.currentCanvas
      document.title = currentCanvas?.title ?? 'Canvas'
    } else {
      document.title = await ctrl.file.getTitle(ctrl.file.currentFile)
    }
  })

  return <></>
}
