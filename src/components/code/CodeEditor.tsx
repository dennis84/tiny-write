import {onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {Scroll} from '../Layout'
import {ContextMenu} from './ContextMenu'
import {codeMirror} from './Style'

export const CodeMirrorContainer = styled('div')`
  width: 100%;
  height: 100%;
  ${codeMirror}
  .cm-editor {
    padding: 0 10px; /* little space for the line numbers */
    border-radius: 0;
    .cm-scroller {
      padding-top: 50px; /* leave space for the navbar */
      padding-left: 20px;
      .cm-content {
        padding-bottom: 90vh;
      }
    }
  }
`

export const CodeEditor = () => {
  let containerRef!: HTMLDivElement

  const {codeService, fileService} = useState()

  onMount(() => {
    const currentFile = fileService.currentFile
    if (!currentFile) return
    codeService.renderEditor(currentFile, containerRef)
    fileService.currentFile?.codeEditorView?.focus()
  })

  return (
    <Scroll data-testid="code_scroll">
      <CodeMirrorContainer ref={containerRef} />
      <ContextMenu />
    </Scroll>
  )
}
