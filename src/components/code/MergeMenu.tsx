import {acceptChunk, getChunks, rejectChunk} from '@codemirror/merge'
import {createMemo, createSignal, onCleanup, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DialogContainer, TooltipButton} from '@/components/dialog/Style'
import {useOpen} from '@/hooks/use-open'
import {useState} from '@/state'
import {IconCheck, IconClose} from '../Icon'

const MergeMenuContainer = styled('div')`
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
  const {fileService, toastService} = useState()
  const {openFile} = useOpen()
  const [autoClose, setAutoClose] = createSignal(true)

  const onAccept = () => {
    const view = fileService.currentFile?.codeEditorView
    if (!view) return
    setAutoClose(false)

    props.chunks?.chunks.forEach((chunk) => {
      acceptChunk(view, chunk.fromA)
    })

    toastService.open({message: 'Full diff applied ✅', duration: 2000})
    openFile(fileService.currentFile, {merge: undefined})
  }

  const onReject = () => {
    const currentFile = fileService.currentFile
    const view = currentFile?.codeEditorView
    if (!view) return
    setAutoClose(false)

    props.chunks?.chunks.forEach((chunk) => {
      rejectChunk(view, chunk.fromA)
    })

    toastService.open({message: 'Full diff rejected ✅', duration: 2000})
    openFile(currentFile, {merge: undefined})
  }

  // Handle when all chunks are resolved in codemirror UI
  onCleanup(() => {
    if (autoClose()) {
      toastService.open({message: 'All chunks applied ✅', duration: 2000})
      openFile(fileService.currentFile, {merge: undefined})
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
