import {For, Match, Show, Switch} from 'solid-js'
import {useDialog} from '@/hooks/use-dialog'
import {createTreeStore} from '@/tree'
import {
  type Attachment,
  AttachmentType,
  type FileAttachment,
  type ProjectAttachment,
  type TextAttachment,
} from '@/types'
import {Button} from '../../Button'
import {DialogFooter, DialogList} from '../../dialog/Style'
import {IconFolderRoot} from '../../icons/File'
import {AttachmentButton} from './AttachmentChip'
import {FileAttachmentChip} from './FileAttachmentChip'
import {TextAttachmentChip} from './TextAttachmentChip'

export const ProjectAttachmentChip = (props: {
  attachment: ProjectAttachment
  onDelete?: (attachment: Attachment) => void
}) => {
  const Tooltip = () => {
    const items = props.attachment.content as (FileAttachment | TextAttachment)[]

    const _tree = createTreeStore({
      items: items.map((it) => ({id: it.fileId, ...it})),
    })

    return (
      <DialogList>
        <For each={props.attachment.content}>
          {(item) => (
            <Switch>
              <Match when={item.type === AttachmentType.File ? item : undefined}>
                {(it) => <FileAttachmentChip attachment={it()} />}
              </Match>
              <Match when={item.type === AttachmentType.Text ? item : undefined}>
                {(it) => <TextAttachmentChip attachment={it()} />}
              </Match>
            </Switch>
          )}
        </For>
        <Show when={props.onDelete}>
          <DialogFooter>
            <Button onClick={() => onDelete(props.attachment)}>Remove</Button>
          </DialogFooter>
        </Show>
      </DialogList>
    )
  }

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
      <IconFolderRoot />
      {props.attachment.projectName ?? 'Project'}
    </AttachmentButton>
  )
}
