import {useState} from '@/state'
import {TooltipButton, TooltipContainer} from '../Tooltip'
import {Show} from 'solid-js'
import {IconAdd, IconCheck, IconClose} from '../Icon'
import {styled} from 'solid-styled-components'
import {acceptChunk, getChunks, rejectChunk} from '@codemirror/merge'
import {fireEvent} from '@solidjs/testing-library'

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
  const {codeService, fileService} = useState()

  const onAccept = () => {
    const view = fileService.currentFile?.codeEditorView
    if (!view) return
    getChunks(view.state)?.chunks.forEach((chunk) => acceptChunk(view, chunk.fromA))
  }

  const onReject = () => {
    const view = fileService.currentFile?.codeEditorView
    if (!view) return
    getChunks(view.state)?.chunks.forEach((chunk) => rejectChunk(view, chunk.fromA))
  }

  return (
    <Show when={codeService.isMergeView()}>
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
