import {createEffect, Index, Show, untrack} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import {serialize, serializeSlice} from '@/prosemirror/markdown-serialize'
import {isProject, useState} from '@/state'
import {
  type Attachment,
  AttachmentType,
  type FileAttachment,
  type ImageAttachment,
  type SelectionAttachment,
} from '@/types'
import {IconButton} from '../../Button'
import {DialogList, TooltipButton, TooltipDivider} from '../../dialog/Style'
import {TooltipHelp} from '../../dialog/TooltipHelp'
import {IconClose, IconPaperclip} from '../../icons/Ui'
import {ScrollHorizontal} from '../../Layout'
import {createCodeFence} from '../util'
import {AddCurrentFile} from './AddCurrentFile'
import {AddCurrentSelection} from './AddCurrentSelection'
import {AddImage} from './AddImage'
import {AttachmentChip} from './AttachmentChip'

const Attachments = styled(ScrollHorizontal)`
  gap: 5px;
`

export const ChatInputAttachments = () => {
  const {store, fileService, mediaService, threadService, projectService, treeService} = useState()

  const Tooltip = () => (
    <DialogList>
      <AddCurrentFile onAttachment={onAttachment} />
      <AddCurrentSelection onAttachment={onAttachment} />
      <AddImage onAttachment={onImageAttachment} />
      <Show when={threadService.attachments().length > 0}>
        <TooltipDivider />
        <TooltipButton onClick={onRemoveAll}>
          <IconClose /> Remove all attachments
        </TooltipButton>
      </Show>
    </DialogList>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const onAttachmentMenu = (e: MouseEvent) => {
    showTooltip({anchor: e.currentTarget as HTMLElement})
  }

  const onAttachment = (attachment: Attachment) => {
    threadService.addAttachment(attachment)
    closeTooltip()
  }

  const onImageAttachment = () => {
    closeTooltip()
  }

  const onRemoveAll = () => {
    threadService.setAttachments([])
  }

  const onRemove = (attachment: Attachment) => {
    threadService.removeAttachment(attachment)
  }

  const onRemoveOthers = (attachment: Attachment) => {
    threadService.attachments().forEach((it) => {
      if (it !== attachment) threadService.removeAttachment(it)
    })
  }

  // Adds dropped files as attachments
  createEffect(() => {
    const droppedFiles = mediaService.droppedFiles()
    const attachments = droppedFiles.map(
      (df) =>
        ({
          type: AttachmentType.Image,
          name: df.name,
          content: df.data,
        }) satisfies ImageAttachment,
    )

    attachments.forEach((it) => {
      threadService.addAttachment(it)
    })
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
    if (!store.ai?.autoContext) return

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

  return (
    <>
      <TooltipHelp title="Add an attachment to context">
        <IconButton onClick={onAttachmentMenu}>
          <IconPaperclip />
        </IconButton>
      </TooltipHelp>
      <Attachments>
        <Index each={threadService.attachments()}>
          {(attachment) => (
            <AttachmentChip
              attachment={attachment()}
              onRemove={onRemove}
              onRemoveOthers={onRemoveOthers}
            />
          )}
        </Index>
      </Attachments>
    </>
  )
}
