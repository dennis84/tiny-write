import {createEffect, Index, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import {useState} from '@/state'
import {type Attachment, AttachmentType, type ImageAttachment} from '@/types'
import {IconButton} from '../../Button'
import {DialogList, TooltipButton, TooltipDivider} from '../../dialog/Style'
import {TooltipHelp} from '../../dialog/TooltipHelp'
import {IconClose, IconPaperclip} from '../../icons/Ui'
import {ScrollHorizontal} from '../../Layout'
import {AddCurrentFile} from './AddCurrentFile'
import {AddCurrentProject} from './AddCurrentProject'
import {AddCurrentSelection} from './AddCurrentSelection'
import {AddImage} from './AddImage'
import {AddParentFile} from './AddParentFile'
import {AttachmentChip} from './AttachmentChip'
import {AutoContext} from './AutoContext'

const Attachments = styled(ScrollHorizontal)`
  gap: 5px;
`

export const ChatInputAttachments = () => {
  const {mediaService, threadService} = useState()

  const Tooltip = () => (
    <DialogList>
      <AddParentFile onAttachment={onAttachment} />
      <AddCurrentFile onAttachment={onAttachment} />
      <AddCurrentSelection onAttachment={onAttachment} />
      <AddCurrentProject onAttachment={onAttachment} />
      <AddImage onAttachment={onImageAttachment} />
      <Show when={threadService.currentThread?.attachments?.length}>
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

  const onRemoveAll = async () => {
    await threadService.setAttachments([])
  }

  const onRemove = async (attachment: Attachment) => {
    await threadService.removeAttachment(attachment)
  }

  const onRemoveOthers = (attachment: Attachment) => {
    threadService.currentThread?.attachments?.forEach(async (it) => {
      if (it !== attachment) await threadService.removeAttachment(it)
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
          mediaType: df.type,
        }) satisfies ImageAttachment,
    )

    attachments.forEach((it) => {
      threadService.addAttachment(it)
    })
  })

  return (
    <>
      <AutoContext />
      <TooltipHelp title="Add an attachment to context">
        <IconButton onClick={onAttachmentMenu}>
          <IconPaperclip />
        </IconButton>
      </TooltipHelp>
      <Attachments>
        <Index each={threadService.currentThread?.attachments}>
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
