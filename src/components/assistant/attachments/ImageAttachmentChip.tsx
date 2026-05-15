import {Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import type {Attachment, ImageAttachment} from '@/types'
import {Button} from '../../Button'
import {DialogFooter} from '../../dialog/Style'

const AttachmentImage = styled.img`
  width: var(--button-height);
  height: var(--button-height);
  border-radius: 10px;
  cursor: var(--cursor-pointer);
`

const TooltipImage = styled.img`
  max-width: 200px;
  max-height: 200px;
  border-radius: 10px;
`

export const ImageAttachmentChip = (props: {
  attachment: ImageAttachment
  onDelete?: (attachment: Attachment) => void
}) => {
  const Tooltip = () => (
    <>
      <TooltipImage src={props.attachment.content} alt="" />
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

  return <AttachmentImage src={props.attachment.content} alt="" onClick={onOpenTooltip} />
}
