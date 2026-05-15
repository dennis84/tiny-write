import {Show, Suspense} from 'solid-js'
import {useDialog} from '@/hooks/use-dialog'
import {useState} from '@/state'
import type {Attachment, SelectionAttachment} from '@/types'
import {Button} from '../../Button'
import {DialogFooter} from '../../dialog/Style'
import {IconTextCursor} from '../../icons/Ui'
import {AttachmentButton, AttachmentTitle, CodeBlock} from './AttachmentChip'

export const SelectionAttachmentChip = (props: {
  attachment: SelectionAttachment
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
      <IconTextCursor />
      <Suspense>
        <AttachmentTitle file={file} codeLang={codeLang} selection={props.attachment.selection} />
      </Suspense>
    </AttachmentButton>
  )
}
