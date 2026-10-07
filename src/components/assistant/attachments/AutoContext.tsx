import {createEffect, untrack} from 'solid-js'
import {isFile, isProject, useState} from '@/state'
import {AttachmentType} from '@/types'

export const AutoContext = () => {
  const {store, treeService, threadService, projectService, fileService} = useState()

  createEffect(() => {
    treeService.tree // listen on tree changes
    const currentThread = threadService.currentThread
    if (!currentThread) return

    if (currentThread.messages.length !== 0) return

    const parentItem = currentThread.parentId
      ? treeService.getItem(currentThread.parentId)
      : undefined

    if (isFile(parentItem?.value) && parentItem.value.code) {
      const attachment = fileService.createAttachment(parentItem.value)
      void threadService.addAttachment(attachment)
    }
  })

  // Refresh project attachment if menu tree was updated
  createEffect(async () => {
    treeService.tree // listen on tree changes
    const attachments = untrack(() => threadService.currentThread?.attachments ?? [])
    for (const attachment of attachments) {
      if (attachment.type === AttachmentType.Project) {
        const project = treeService.getItem(attachment.projectId)?.value
        if (!isProject(project)) continue
        const newAttachment = await projectService.createAttachment(project)
        await threadService.addAttachment(newAttachment)
      }
    }
  })

  // Adds current code file to context
  createEffect(() => {
    store.lastTr // Listen on editor changes

    const currentFile = fileService.currentFile
    const editorView = currentFile?.editorView
    const codeEditorView = currentFile?.codeEditorView
    const currentThread = threadService.currentThread
    if (
      !currentThread ||
      !currentFile ||
      // prevent updating on blur (loose selection)
      (editorView && !editorView?.hasFocus()) ||
      (codeEditorView && !codeEditorView.hasFocus)
    ) {
      return
    }

    const attachment = fileService.createAttachment(currentFile)
    void threadService.addAttachment(attachment)
  })

  return null
}
