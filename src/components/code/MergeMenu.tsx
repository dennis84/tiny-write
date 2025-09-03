import {acceptChunk, getChunks, rejectChunk} from '@codemirror/merge'
import {Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useOpen} from '@/hooks/open'
import {useState} from '@/state'
import {IconCheck, IconClose} from '../Icon'
import {TooltipButton, TooltipContainer} from '../Tooltip'

const MergeMenuContainer = styled('div')`
  position: fixed;
  z-index: var(--z-index-tooltip);
  pointer-events: none;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding: 20px;
  > * {
    pointer-events: auto;
  }
`

export const MergeMenu = () => {
  let tooltipRef!: HTMLDivElement
  const {store, fileService} = useState()
  const {openFile} = useOpen()

  const onAccept = () => {
    const view = fileService.currentFile?.codeEditorView
    if (!view) return
    getChunks(view.state)?.chunks.forEach((chunk) => {
      acceptChunk(view, chunk.fromA)
    })
  }

  const onReject = () => {
    const currentFile = fileService.currentFile
    const view = currentFile?.codeEditorView
    if (!view) return
    getChunks(view.state)?.chunks.forEach((chunk) => {
      rejectChunk(view, chunk.fromA)
    })
    openFile(currentFile)
  }

  return (
    <Show when={store.args?.merge}>
      <MergeMenuContainer>
        <TooltipContainer ref={tooltipRef} direction="row" gap={5}>
          <TooltipButton onClick={onAccept}>
            <IconCheck /> Accept file
          </TooltipButton>
          <TooltipButton onClick={onReject}>
            <IconClose /> Reject file
          </TooltipButton>
        </TooltipContainer>
      </MergeMenuContainer>
    </Show>
  )
}
