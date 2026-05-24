import {Suspense} from 'solid-js'
import {useDialog} from '@/hooks/use-dialog'
import {useState} from '@/state'
import type {TextAttachment} from '@/types'
import {Button} from '../../Button'
import {DialogFooter} from '../../dialog/Style'
import {LangIcon} from '../../icons/LangIcon'
import {AttachmentButton, AttachmentTitle, CodeBlock} from './AttachmentChip'

export const TextAttachmentChip = (props: {attachment: TextAttachment; title?: string}) => {
  const {fileService, threadService} = useState()

  const file = props.attachment.fileId
    ? fileService.findFileById(props.attachment.fileId)
    : undefined

  const Tooltip = () => (
    <>
      <CodeBlock content={props.attachment.content} />
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
      <LangIcon name="markdown" />
      <Suspense>
        <AttachmentTitle file={file} />
      </Suspense>
    </AttachmentButton>
  )
}
