import {Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import type {ImageAttachment} from '@/types'
import {Button} from '../../Button'
import {DialogFooter} from '../../dialog/Style'
import type {AttachmentActions} from './AttachmentChip'

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

interface Props extends AttachmentActions<ImageAttachment> {
  attachment: ImageAttachment
}

export const ImageAttachmentChip = (props: Props) => {
  const Tooltip = () => (
    <>
      <TooltipImage src={props.attachment.content} alt="" />
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

  return <AttachmentImage src={props.attachment.content} alt="" onClick={onOpenTooltip} />
}
