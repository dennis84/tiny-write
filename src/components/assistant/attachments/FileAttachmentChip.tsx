import {Show} from 'solid-js'
import {useDialog} from '@/hooks/use-dialog'
import {useState} from '@/state'
import type {Attachment, FileAttachment} from '@/types'
import {Button} from '../../Button'
import {DialogFooter} from '../../dialog/Style'
import {LangIcon} from '../../icons/LangIcon'
import {AttachmentButton, AttachmentTitle, CodeBlock} from './AttachmentChip'

export const FileAttachmentChip = (props: {
  attachment: FileAttachment
  onDelete?: (attachment: Attachment) => void
}) => {
  const {fileService} = useState()

  const file = props.attachment.fileId
    ? fileService.findFileById(props.attachment.fileId)
    : undefined

  const codeLang = props.attachment.codeLang ?? file?.codeLang

  const Tooltip = () => (
    <>
      <CodeBlock content={props.attachment.content} codeLang={codeLang} />
      <Show when={props.onDelete}>
        <DialogFooter>
          <Button onClick={() => onDelete(props.attachment)}>Remove</Button>
        </DialogFooter>
      </Show>
    </>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const onOpenTooltip = (e: MouseEvent) => {
    showTooltip({anchor: e.currentTarget as HTMLElement})
  }

  const onDelete = (attachment: Attachment) => {
    closeTooltip()
    props.onDelete?.(attachment)
  }

  return (
    <AttachmentButton onClick={onOpenTooltip}>
      <LangIcon name={codeLang} />
      <AttachmentTitle file={file} codeLang={codeLang} />
    </AttachmentButton>
  )
}
