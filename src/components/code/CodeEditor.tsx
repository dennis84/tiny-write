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

  const [store, ctrl] = useState()

  createEffect(() => {
    const currentFile = ctrl.file.currentFile
    if (!currentFile || !store.collab) return

    const provider = ctrl.collab.getProvider(currentFile.id)
    if (!provider) {
      ctrl.collab.init(currentFile)
    }

    if (provider && currentFile?.codeEditorView === undefined) {
      ctrl.code.renderEditor(currentFile, containerRef)
    }
  })

  createEffect((prev) => {
    if (!prev) return
    const currentFile = ctrl.file.currentFile
    if (!currentFile) return
    ctrl.code.updateConfig(currentFile)
    return store.config
  })

  onCleanup(() => {
    ctrl.file.destroy(ctrl.file.currentFile?.id)
  })

  return (
    <Scroll data-testid="code_scroll">
      <CodeMirrorContainer ref={containerRef} />
    </Scroll>
  )
}
