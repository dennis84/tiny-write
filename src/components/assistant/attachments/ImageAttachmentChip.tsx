import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import {useState} from '@/state'
import type {ImageAttachment} from '@/types'
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

export const ImageAttachmentChip = (props: {attachment: ImageAttachment}) => {
  const {threadService} = useState()

  const Tooltip = () => (
    <>
      <TooltipImage src={props.attachment.content} alt="" />
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

  return <AttachmentImage src={props.attachment.content} alt="" onClick={onOpenTooltip} />
}
