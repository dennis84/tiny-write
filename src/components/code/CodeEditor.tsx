import {createEffect, onCleanup} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {Scroll} from '../Layout'
import {codeMirror} from './Style'

export const CodeMirrorContainer = styled('div')`
  width: 100%;
  height: 100%;
  ${codeMirror}
  .cm-editor {
    border-radius: 0;
  }
`

export const CodeEditor = () => {
  let containerRef!: HTMLDivElement

  const {store, codeService, collabService, fileService} = useState()

  createEffect(() => {
    const currentFile = fileService.currentFile
    if (!currentFile || !store.collab) return

    const provider = collabService.getProvider(currentFile.id)
    if (!provider) {
      collabService.init(currentFile)
    }

    if (provider && currentFile?.codeEditorView === undefined) {
      codeService.renderEditor(currentFile, containerRef)
    }
  })

  createEffect((prev) => {
    if (!prev) return
    const currentFile = fileService.currentFile
    if (!currentFile) return
    codeService.updateConfig(currentFile)
    return store.config
  })

  onCleanup(() => {
    fileService.destroy(fileService.currentFile?.id)
  })

  return (
    <Scroll data-testid="code_scroll">
      <CodeMirrorContainer ref={containerRef} />
    </Scroll>
  )
}
