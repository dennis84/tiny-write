import {Index, Match, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import {useState} from '@/state'
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
import {type AttachmentActions, AttachmentButton, CodeBlock} from './AttachmentChip'
import {FileAttachmentChip} from './FileAttachmentChip'
import {TextAttachmentChip} from './TextAttachmentChip'

const ProjectDialogList = styled(DialogList)`
  min-width: 200px;
`

interface Props extends AttachmentActions<ProjectAttachment> {
  attachment: ProjectAttachment
}

export const ProjectAttachmentChip = (props: Props) => {
  const {threadService} = useState()

  const Tooltip = () => {
    const onRemove = async (attachment: Attachment) => {
      if (!('fileId' in attachment)) return
      const fileId = attachment.fileId
      if (!fileId) return

      const updated: ProjectAttachment = {
        ...props.attachment,
        files: props.attachment.files.filter((it) => it !== attachment),
      }

      await threadService.addAttachment(updated)
    }

    return (
      <ProjectDialogList>
        <CodeBlock content={props.attachment.tree} />
        <Index each={props.attachment.files}>
          {(it) => (
            <Switch>
              <Match when={it().type === AttachmentType.Text}>
                <TextAttachmentChip attachment={it() as TextAttachment} onRemove={onRemove} />
              </Match>
              <Match when={it().type === AttachmentType.File}>
                <FileAttachmentChip attachment={it() as FileAttachment} onRemove={onRemove} />
              </Match>
            </Switch>
          )}
        </Index>
        <DialogFooter>
          <Show when={props.onRemove}>
            <Button onClick={onDelete}>Remove</Button>
          </Show>
          <Show when={props.onRemoveOthers}>
            <Button onClick={onDeleteOthers}>Remove others</Button>
          </Show>
        </DialogFooter>
      </ProjectDialogList>
    )
  }

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
    <AttachmentButton onClick={onOpenTooltip} id={Date.now().toString()}>
      <IconFolderRoot />
      {props.attachment.projectName ?? 'Project'}
    </AttachmentButton>
  )
}
