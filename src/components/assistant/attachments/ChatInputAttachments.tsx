import {createEffect, Index} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import {useState} from '@/state'
import {
  type Attachment,
  AttachmentType,
  type FileAttachment,
  type ImageAttachment,
  type SelectionAttachment,
} from '@/types'
import {IconButton} from '../../Button'
import {DialogList} from '../../dialog/Style'
import {TooltipHelp} from '../../dialog/TooltipHelp'
import {IconPaperclip} from '../../icons/Ui'
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
  const {store, fileService, mediaService, threadService} = useState()

  const Tooltip = () => (
    <DialogList>
      <AddCurrentFile onAttachment={onAttachment} />
      <AddCurrentSelection onAttachment={onAttachment} />
      <AddImage onAttachment={onImageAttachment} />
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

  const onDelete = (attachment: Attachment) => {
    threadService.removeAttachment(attachment)
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

  // Adds current code file to context if autoContext is enabled
  createEffect(() => {
    if (!store.ai?.autoContext) return

    store.lastTr // Listen on editor changes

    const currentFile = fileService.currentFile
    const editorView = currentFile?.codeEditorView
    const currentThread = threadService.currentThread

    if (!editorView || !currentThread) return

    const content = createCodeFence({
      code: editorView.state.doc.toString(),
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

    // Add current selection as context message
    if (!editorView.state.selection.main.empty) {
      const ranges = editorView.state.selection.ranges.map((it) => [it.from, it.to] as const)
      const content = editorView.state.selection.ranges
        .map((range) =>
          createCodeFence({
            code: editorView.state.sliceDoc(range.from, range.to),
            id: currentFile.id,
            lang: currentFile.codeLang,
            path: currentFile.path,
            range: [range.from, range.to],
          }),
        )
        .join('\n')

      const attachment: SelectionAttachment = {
        type: AttachmentType.Selection,
        fileId: currentFile.id,
        content,
        selection: ranges,
        codeLang: currentFile.codeLang,
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
          {(attachment) => <AttachmentChip attachment={attachment()} onDelete={onDelete} />}
        </Index>
      </Attachments>
    </>
  )
}
