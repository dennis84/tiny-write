import {Index, Match, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
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
import {AttachmentButton, CodeBlock} from './AttachmentChip'
import {FileAttachmentChip} from './FileAttachmentChip'
import {TextAttachmentChip} from './TextAttachmentChip'

const ProjectDialogList = styled(DialogList)`
  min-width: 200px;
`

export const ProjectAttachmentChip = (props: {
  attachment: ProjectAttachment
  onDelete?: (attachment: Attachment) => void
}) => {
  const Tooltip = () => {
    return (
      <ProjectDialogList>
        <CodeBlock content={props.attachment.tree} />
        <Index each={props.attachment.files}>
          {(it) => (
            <Switch>
              <Match when={it().type === AttachmentType.Text}>
                <TextAttachmentChip attachment={it() as TextAttachment} />
              </Match>
              <Match when={it().type === AttachmentType.File}>
                <FileAttachmentChip attachment={it() as FileAttachment} />
              </Match>
            </Switch>
          )}
        </Index>
        <Show when={props.onDelete}>
          <DialogFooter>
            <Button onClick={() => onDelete(props.attachment)}>Remove</Button>
          </DialogFooter>
        </Show>
      </ProjectDialogList>
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
    <AttachmentButton onClick={onOpenTooltip} id={Date.now().toString()}>
      <IconFolderRoot />
      {props.attachment.projectName ?? 'Project'}
    </AttachmentButton>
  )
}
