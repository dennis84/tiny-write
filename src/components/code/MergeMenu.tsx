import {acceptChunk, getChunks, rejectChunk} from '@codemirror/merge'
import {createMemo, createSignal, onCleanup, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DialogContainer, TooltipButton} from '@/components/dialog/Style'
import {useState} from '@/state'
import {IconCheck, IconClose} from '../icons/Ui'

const MergeMenuContainer = styled.div`
  position: fixed;
  z-index: var(--z-index-dialog);
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

type ChunksType = ReturnType<typeof getChunks>

const MergeMenuWithChunks = (props: {chunks: ChunksType}) => {
  let tooltipRef!: HTMLDivElement
  const {fileService, dialogService, locationService} = useState()
  const [autoClose, setAutoClose] = createSignal(true)

  const onAccept = () => {
    const view = fileService.currentFile?.codeEditorView
    if (!view) return
    setAutoClose(false)

    props.chunks?.chunks.forEach((chunk) => {
      acceptChunk(view, chunk.fromA)
    })

    dialogService.toast({message: 'Full diff applied ✅', duration: 2000})
    locationService.openItem(fileService.currentFile, {merge: undefined})
  }

  const onReject = () => {
    const currentFile = fileService.currentFile
    const view = currentFile?.codeEditorView
    if (!view) return
    setAutoClose(false)

    props.chunks?.chunks.forEach((chunk) => {
      rejectChunk(view, chunk.fromA)
    })

    dialogService.toast({message: 'Full diff rejected ✅', duration: 2000})
    locationService.openItem(currentFile, {merge: undefined})
  }

  // Handle when all chunks are resolved in codemirror UI
  onCleanup(() => {
    if (autoClose()) {
      dialogService.toast({message: 'All chunks applied ✅', duration: 2000})
      locationService.openItem(fileService.currentFile, {merge: undefined})
    }
  })

  return (
    <MergeMenuContainer>
      <DialogContainer ref={tooltipRef} direction="row" gap={5}>
        <TooltipButton onClick={onAccept} data-testid="accept_all">
          <IconCheck /> Accept file
        </TooltipButton>
        <TooltipButton onClick={onReject} data-testid="reject_all">
          <IconClose /> Reject file
        </TooltipButton>
      </DialogContainer>
    </MergeMenuContainer>
  )
}

export const MergeMenu = () => {
  const {store, locationService, fileService} = useState()

  const chunks = createMemo(() => {
    const view = fileService.currentFile?.codeEditorView
    if (view && locationService.state?.merge && store.lastTr) {
      const result = getChunks(view.state)
      if (!result?.chunks.length) return null
      return result
    }

    return null
  })

  return <Show when={chunks()}>{(result) => <MergeMenuWithChunks chunks={result()} />}</Show>
}
