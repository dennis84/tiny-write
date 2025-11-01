import {createEffect, For} from 'solid-js'
import {type Attachment, MessageType, useState} from '@/state'
import {MessageAttachment} from './MessageAttachment'
import {createCodeFence} from './util'

export const AutoContext = () => {
  const {store, fileService, mediaService, threadService} = useState()

  const onDelete = (attachment: Attachment) => {
    threadService.removeAttachment(attachment)
  }

  // Adds dropped files as attachments
  createEffect(() => {
    const droppedFiles = mediaService.droppedFiles()
    const attachments = droppedFiles.map((df) => ({
      type: MessageType.Image,
      name: df.name,
      content: df.data,
    }))

    attachments.forEach((it) => {
      threadService.addAttachment(it)
    })
  })

  const hasMessageWithAttachment = (attachment: Attachment) => {
    let result = false

    threadService.traverseTree((it) => {
      if (it.value.attachments?.some((a) => a.content === attachment.content)) {
        result = true
      }
    })

    return result
  }

  // Adds current code file to context if autoContext is enabled
  createEffect(() => {
    if (!store.ai?.autoContext) return

    // Listen on editor changes
    if (!store.lastTr) return

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
        type: MessageType.Selection,
        fileId: currentFile.id,
        content,
        selection: [sel.from, sel.to],
        codeLang: currentFile.codeLang,
      }

      // Don't add selection if same content already in thread
      if (hasMessageWithAttachment(attachment)) {
        return
      }

      threadService.addAttachment(attachment)
    }

    const content = createCodeFence({
      code: editorView.state.doc.toString(),
      id: currentFile.id,
      lang: currentFile.codeLang,
      path: currentFile.path,
    })

    const attachment: Attachment = {
      type: MessageType.File,
      fileId: currentFile.id,
      codeLang: currentFile.codeLang,
      content,
    }

    // Don't add current file if same content already in thread
    if (hasMessageWithAttachment(attachment)) {
      return
    }

    threadService.addAttachment(attachment)
  })

  return (
    <For each={threadService.attachments()}>
      {(attachment) => <MessageAttachment attachment={attachment} onDelete={onDelete} />}
    </For>
  )
}
