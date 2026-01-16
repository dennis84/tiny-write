import {createEffect, For} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {type Attachment, AttachmentType} from '@/types'
import {AttachmentChip} from './AttachmentChip'
import {createCodeFence} from './util'

const Attachments = styled('div')`
  display: flex;
  min-width: 0;
  gap: 5px;
  justify-content: flex-end;
  justify-self: flex-start;
  margin-right: auto;
`

export const ChatInputAttachments = () => {
  const {store, fileService, mediaService, threadService} = useState()

  const onDelete = (attachment: Attachment) => {
    threadService.removeAttachment(attachment)
  }

  // Adds dropped files as attachments
  createEffect(() => {
    const droppedFiles = mediaService.droppedFiles()
    const attachments = droppedFiles.map((df) => ({
      type: AttachmentType.Image,
      name: df.name,
      content: df.data,
    }))

    attachments.forEach((it) => {
      threadService.addAttachment(it)
    })
  })

  // Adds current code file to context if autoContext is enabled
  createEffect(() => {
    if (!store.ai?.autoContext) return

    store.lastTr // Listen on editor changes

    const currentFile = fileService.currentFile
    const editorView = currentFile?.codeEditorView

    const currentThread = threadService.currentThread

    if (!editorView || !currentThread) return

    const sel = editorView.state.selection.main

    // Add current selection as context message
    if (!sel.empty) {
      const content = createCodeFence({
        code: editorView.state.sliceDoc(sel.from, sel.to),
        id: currentFile.id,
        lang: currentFile.codeLang,
        path: currentFile.path,
        range: [sel.from, sel.to],
      })

      const attachment: Attachment = {
        type: AttachmentType.Selection,
        fileId: currentFile.id,
        content,
        selection: [sel.from, sel.to],
        codeLang: currentFile.codeLang,
      }

      threadService.addAttachment(attachment)
      return
    }

    const content = createCodeFence({
      code: editorView.state.doc.toString(),
      id: currentFile.id,
      lang: currentFile.codeLang,
      path: currentFile.path,
    })

    const attachment: Attachment = {
      type: AttachmentType.File,
      fileId: currentFile.id,
      codeLang: currentFile.codeLang,
      content,
    }

    threadService.addAttachment(attachment)
  })

  return (
    <Attachments>
      <For each={threadService.attachments()}>
        {(attachment) => <AttachmentChip attachment={attachment} onDelete={onDelete} />}
      </For>
    </Attachments>
  )
}
