import {createEffect, untrack} from 'solid-js'
import {serialize, serializeSlice} from '@/prosemirror/markdown-serialize'
import {isFile, isProject, useState} from '@/state'
import {AttachmentType, type FileAttachment, type SelectionAttachment} from '@/types'
import {createCodeFence} from '../util'

export const AutoContext = () => {
  const {store, treeService, threadService, projectService, fileService} = useState()

  createEffect(() => {
    treeService.tree // listen on tree changes
    const currentThread = threadService.currentThread
    if (!currentThread) return

    const parentItem = currentThread.parentId
      ? treeService.getItem(currentThread.parentId)
      : undefined

    if (isFile(parentItem?.value)) {
      const attachment = fileService.createAttachment(parentItem.value)
      threadService.addAttachment(attachment)
    }
  })

  // Refresh project attachment if menu tree was updated
  createEffect(async () => {
    treeService.tree // listen on tree changes
    const attachments = untrack(() => threadService.attachments())
    for (const attachment of attachments) {
      if (attachment.type === AttachmentType.Project) {
        const project = treeService.getItem(attachment.projectId)?.value
        if (!isProject(project)) continue
        const newAttachment = await projectService.createAttachment(project)
        threadService.addAttachment(newAttachment)
      }
    }
  })

  // Adds current code file to context if autoContext is enabled
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

    let code: string | undefined
    let selection: Pick<SelectionAttachment, 'content' | 'selection'> | undefined

    if (editorView) {
      code = serialize(editorView.state)
      if (!editorView.state.selection.empty) {
        const ranges = editorView.state.selection.ranges.map(
          (it) => [it.$from.pos, it.$to.pos] as const,
        )
        const content = editorView.state.selection.ranges
          .map((range) =>
            createCodeFence({
              code: serializeSlice(editorView.state.doc.slice(range.$from.pos, range.$to.pos)),
              id: currentFile.id,
              lang: currentFile.codeLang,
              path: currentFile.path,
              range: [range.$from.pos, range.$to.pos],
            }),
          )
          .join('\n')
        selection = {selection: ranges, content}
      }
    }

    if (codeEditorView) {
      code = codeEditorView.state.doc.toString()

      if (!codeEditorView.state.selection.main.empty) {
        const ranges = codeEditorView.state.selection.ranges.map((it) => [it.from, it.to] as const)
        const content = codeEditorView.state.selection.ranges
          .map((range) =>
            createCodeFence({
              code: codeEditorView.state.sliceDoc(range.from, range.to),
              id: currentFile.id,
              lang: currentFile.codeLang,
              path: currentFile.path,
              range: [range.from, range.to],
            }),
          )
          .join('\n')
        selection = {selection: ranges, content}
      }
    }

    if (code) {
      const content = createCodeFence({
        code,
        id: currentFile.id,
        lang: currentFile.codeLang,
        path: currentFile.path,
      })

      const attachment: FileAttachment = {
        type: AttachmentType.File,
        fileId: currentFile.id,
        projectId: currentFile.projectId,
        codeLang: currentFile.codeLang,
        content,
      }

      threadService.addAttachment(attachment)
    }

    if (selection) {
      const attachment: SelectionAttachment = {
        type: AttachmentType.Selection,
        fileId: currentFile.id,
        codeLang: currentFile.codeLang,
        ...selection,
      }

      threadService.addAttachment(attachment)
    }
  })

  return null
}
