import {Show} from 'solid-js'
import {useDialog} from '@/hooks/use-dialog'
import {useState} from '@/state'
import type {FileAttachment} from '@/types'
import {Button} from '../../Button'
import {DialogFooter} from '../../dialog/Style'
import {LangIcon} from '../../icons/LangIcon'
import {
  type AttachmentActions,
  AttachmentButton,
  AttachmentTitle,
  CodeBlock,
} from './AttachmentChip'

interface Props extends AttachmentActions<FileAttachment> {
  attachment: FileAttachment
}

export const FileAttachmentChip = (props: Props) => {
  const {fileService} = useState()

  const file = props.attachment.fileId
    ? fileService.findFileById(props.attachment.fileId)
    : undefined

  const codeLang = props.attachment.codeLang ?? file?.codeLang

  const Tooltip = () => (
    <>
      <CodeBlock content={props.attachment.content} codeLang={codeLang} />
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
      <LangIcon name={codeLang} />
      <AttachmentTitle file={file} codeLang={codeLang} />
    </AttachmentButton>
  )
}
