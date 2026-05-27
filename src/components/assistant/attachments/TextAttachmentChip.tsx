import {Show, Suspense} from 'solid-js'
import {useDialog} from '@/hooks/use-dialog'
import {useState} from '@/state'
import type {TextAttachment} from '@/types'
import {Button} from '../../Button'
import {DialogFooter} from '../../dialog/Style'
import {LangIcon} from '../../icons/LangIcon'
import {
  type AttachmentActions,
  AttachmentButton,
  AttachmentTitle,
  CodeBlock,
} from './AttachmentChip'

interface Props extends AttachmentActions<TextAttachment> {
  attachment: TextAttachment
  title?: string
}

export const TextAttachmentChip = (props: Props) => {
  const {fileService} = useState()

  const file = props.attachment.fileId
    ? fileService.findFileById(props.attachment.fileId)
    : undefined

  const Tooltip = () => (
    <>
      <CodeBlock content={props.attachment.content} />
      <DialogFooter>
        <Show when={props.onRemove}>
          <Button onClick={onDelete}>Remove</Button>
        </Show>
        <Show when={props.onRemoveOthers}>
          <Button onClick={onDeleteOthers}>Remove others</Button>
        </Show>
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
    props.onRemove?.(props.attachment)
  }

  const onDeleteOthers = () => {
    closeTooltip()
    props.onRemoveOthers?.(props.attachment)
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
