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
  id?: string
  title: string
  lang?: string
  path?: string
  rows?: [number, number]
}

export const createCodeDetails = (props: CodeDetails) => {
  let content = ''

  // 2 additional newlines, otherwise the answer will contain the container
  content += `::: details ${props.title}\n\n\n`
  content += '```'
  content += props.lang ?? ''
  content += props.id ? ` id=${props.id}` : ''
  content += props.rows ? ` range=:${props.rows[0] + 1}-${props.rows[1] + 1}` : ''
  content += '\n'
  content += props.code
  content += '\n```\n\n\n'
  content += ':::'

  return content
}

export const parseCodeBlockAttrs = (input: string): Record<string, string> => {
  const pairs = input.split(' ')
  const result: Record<string, string> = {}
  pairs.forEach((pair) => {
    const [key, value] = pair.split('=')
    result[key] = value
  })

  return result
}
