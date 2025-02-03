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
  lang?: string
  path?: string
  range?: [number, number]
}

export const createCodeFence = (props: CodeDetails) => {
  let content = ''

  content += '```'
  content += props.lang ?? ''
  content += props.id ? ` id=${props.id}` : ''
  content += props.range ? ` range=${props.range[0]}-${props.range[1]}` : ''
  content += '\n'
  content += props.code
  content += '\n```'

  return content
}

interface CodeBlockAttrs {
  id?: string
  range?: [number, number]
}

export const parseCodeBlockAttrs = (input: string): CodeBlockAttrs => {
  // input: id=123 range=1-12
  const pairs = input.split(' ')
  const obj: Record<string, string> = {}
  pairs.forEach((pair) => {
    const [key, value] = pair.split('=')
    obj[key] = value
  })

  return {
    id: obj['id'],
    range: obj['range']?.split('-').map((s) => parseInt(s, 10)) as [number, number],
  }
}
