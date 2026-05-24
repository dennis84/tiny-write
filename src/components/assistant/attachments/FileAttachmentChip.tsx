import {useDialog} from '@/hooks/use-dialog'
import {useState} from '@/state'
import type {FileAttachment} from '@/types'
import {Button} from '../../Button'
import {DialogFooter} from '../../dialog/Style'
import {LangIcon} from '../../icons/LangIcon'
import {AttachmentButton, AttachmentTitle, CodeBlock} from './AttachmentChip'

export const FileAttachmentChip = (props: {attachment: FileAttachment}) => {
  const {fileService, threadService} = useState()

  const file = props.attachment.fileId
    ? fileService.findFileById(props.attachment.fileId)
    : undefined

  const codeLang = props.attachment.codeLang ?? file?.codeLang

  const Tooltip = () => (
    <>
      <CodeBlock content={props.attachment.content} codeLang={codeLang} />
      <DialogFooter>
        <Button onClick={onDelete}>Remove</Button>
        <Button onClick={onDeleteOthers}>Remove others</Button>
      </DialogFooter>
    </>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const onOpenTooltip = (e: MouseEvent) => {
    showTooltip({anchor: e.currentTarget as HTMLElement})
  }

  const onDelete = () => {
    closeTooltip()
    threadService.removeAttachment(props.attachment)
  }

  const onDeleteOthers = () => {
    closeTooltip()
    threadService.attachments().forEach((it) => {
      if (it !== props.attachment) threadService.removeAttachment(it)
    })
  }

  return (
    <AttachmentButton onClick={onOpenTooltip}>
      <LangIcon name={codeLang} />
      <AttachmentTitle file={file} codeLang={codeLang} />
    </AttachmentButton>
  )
}
