import {Accessor, createEffect, createSignal} from 'solid-js'
import {File, Mode, useState} from '@/state'

export const useCurrentFile = (): Accessor<File | undefined> => {
  const [currentFile, setCurrentFile] = createSignal<File>()
  const {store, canvasService, fileService} = useState()

  createEffect(() => {
    if (store.mode === Mode.Code || store.mode === Mode.Editor) {
      setCurrentFile(fileService.currentFile)
    } else if (store.mode === Mode.Canvas) {
      const elementId = canvasService.currentCanvas?.elements.find((el) => el.selected)?.id
      if (elementId) setCurrentFile(fileService.findFileById(elementId))
      else setCurrentFile(undefined)
    }
  })

  return currentFile
}

interface CodeDetails {
  code: string
  title: string
  lang?: string
  path?: string
}

export const createCodeDetails = (props: CodeDetails) => {
  let content = ''
  content += `::: details ${props.title}\n`
  content += '```'
  content += props.lang ?? ''
  content += props.path ? ' ' + props.path : ''
  content += '\n'
  content += props.code
  content += '\n```\n'
  content += ':::'
  return content
}
