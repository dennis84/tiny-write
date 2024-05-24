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

  const [, ctrl] = useState()

  createEffect(() => {
    const currentFile = ctrl.file.currentFile
    if (currentFile && currentFile?.codeEditorView === undefined) {
      ctrl.code.renderEditor(currentFile.id, containerRef)
    }
  })

  onCleanup(() => {
    ctrl.file.destroy(ctrl.file.currentFile?.id)
  })

  return (
    <Scroll>
      <CodeMirrorContainer ref={containerRef} />
    </Scroll>
  )
}
