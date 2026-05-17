import {For, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {LangIcon} from '@/components/icons/LangIcon'
import {IconDelete, IconDot} from '@/components/icons/Ui'
import {
  TreeLinkItem,
  TreeLinkMenu,
  TreeLinkTitle,
  TreeToggleDisabled,
} from '@/components/menu/tree/Style'
import {useDialog} from '@/hooks/use-dialog'
import {useState} from '@/state'
import {createTreeStore} from '@/tree'
import type {Attachment, ProjectAttachment} from '@/types'
import {Button} from '../../Button'
import {DialogFooter, DialogList} from '../../dialog/Style'
import {IconFolderRoot} from '../../icons/File'
import {AttachmentButton, AttachmentTitle} from './AttachmentChip'

const ProjectDialogList = styled(DialogList)`
  min-width: 200px;
`

export const ProjectAttachmentChip = (props: {
  attachment: ProjectAttachment
  onDelete?: (attachment: Attachment) => void
}) => {
  const {fileService, locationService, threadService} = useState()

  const Tooltip = () => {
    const tree = createTreeStore({
      items: props.attachment.content.map((it) => ({id: it.fileId as string, ...it})),
    })

    const Tree = (p: {childrenIds: string[]; level: number}) => (
      <For each={p.childrenIds}>{(id) => <TreeItem id={id} level={p.level} />}</For>
    )

    const TreeItem = (p: {id: string; level: number}) => {
      return (
        <Show when={tree.getItem(p.id)}>
          {(item) => {
            const fileId = item().value.fileId
            const file = fileId ? fileService.findFileById(fileId) : undefined
            const onClick = () => {
              locationService.openItem(file)
            }

            const onDelete = () => {
              const affected = new Set(tree.remove(item().id).map((it) => it.id))
              const content = props.attachment.content.filter(
                (it) => !affected.has(it.fileId ?? ''),
              )
              threadService.addAttachment({...props.attachment, content})
            }

            return (
              <>
                <TreeLinkItem>
                  <TreeToggleDisabled class="toggle" level={p.level}>
                    <IconDot />
                  </TreeToggleDisabled>
                  <TreeLinkTitle onClick={onClick}>
                    <LangIcon name={file?.codeLang} />
                    <AttachmentTitle file={file} codeLang={file?.codeLang} />
                  </TreeLinkTitle>
                  <TreeLinkMenu onClick={onDelete}>
                    <IconDelete />
                  </TreeLinkMenu>
                </TreeLinkItem>
                <Show when={item().childrenIds.length > 0}>
                  <Tree childrenIds={item().childrenIds} level={p.level + 1} />
                </Show>
              </>
            )
          }}
        </Show>
      )
    }

    return (
      <ProjectDialogList>
        <Tree childrenIds={tree.rootItemIds} level={0} />
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
