import {Match, Show, Switch} from 'solid-js'
import {DialogList, TooltipButton, TooltipDivider} from '@/components/dialog/Style'
import {IconCanvas, IconCodeBlocks, IconFolderRoot} from '@/components/icons/File'
import {LangIcon} from '@/components/icons/LangIcon'
import {IconClose, IconDelete, IconEdit, IconFocus, IconHistory} from '@/components/icons/Ui'
import {useConfirmDialog} from '@/hooks/use-confirm-dialog'
import {useInputLine} from '@/hooks/use-input-line'
import {CanvasService} from '@/services/CanvasService'
import type {Dialog} from '@/services/DialogService'
import {
  isCanvas,
  isDeletable,
  isFile,
  isLocalFile,
  isProject,
  isProjectItem,
  useState,
} from '@/state'
import type {MenuTreeItem} from '@/types'

export interface TooltipState {
  selected?: MenuTreeItem
}

export const Tooltip = (props: {dialog: Dialog<TooltipState>}) => {
  const {
    canvasService,
    deleteService,
    dialogService,
    fileService,
    locationService,
    projectService,
    treeService,
  } = useState()
  const showInputLine = useInputLine()
  const showConfirmDialog = useConfirmDialog()

  const selected = props.dialog.state.selected

  const onFocus = async () => {
    if (!selected) return
    await canvasService.focus(selected.id)
    dialogService.close(props.dialog)
  }

  const onNewFile = async () => {
    const file = await fileService.newFile()
    locationService.openItem(file)
    dialogService.close(props.dialog)
  }

  const onNewCanvas = async () => {
    const canvas = await canvasService.newCanvas()
    locationService.openItem(canvas)
    dialogService.close(props.dialog)
  }

  const onNewCode = async () => {
    const file = await fileService.newFile({code: true})
    locationService.openItem(file)
    dialogService.close(props.dialog)
  }

  const onNewProject = async () => {
    await projectService.newProject()
    dialogService.close(props.dialog)
  }

  const onAddFile = async () => {
    if (!selected) return
    const project = treeService.getProjectItem(selected.id)
    const file = await fileService.newFile({parentId: selected.id, projectId: project?.id})
    if (treeService.isCollapsed(selected.id)) {
      await treeService.collapse(selected.id)
    }

    locationService.openItem(file)
    dialogService.close(props.dialog)
  }

  const onAddCanvas = async () => {
    if (!selected) return
    const canvas = await canvasService.newCanvas({parentId: selected.id})
    locationService.openItem(canvas)
    dialogService.close(props.dialog)
  }

  const onAddCode = async () => {
    if (!selected) return
    const project = treeService.getProjectItem(selected.id)
    const file = await fileService.newFile({
      code: true,
      parentId: selected.id,
      projectId: project?.id,
    })

    locationService.openItem(file)
    dialogService.close(props.dialog)
  }

  const onRename = async (e: MouseEvent) => {
    e.stopPropagation() // prevent bubble to drawer onClick

    dialogService.close(props.dialog)
    if (!selected) return
    const item = selected.value

    if (isFile(item)) {
      const title = await fileService.getFilename(item)
      showInputLine({
        value: title ?? '',
        onEnter: async (value: string) => {
          await fileService.renameFile(item.id, value)
        },
      })
    } else if (isCanvas(item)) {
      showInputLine({
        value: item.title ?? '',
        onEnter: async (value: string) => {
          const title = value.trim() || undefined
          canvasService.updateCanvas(item.id, {title})
          await CanvasService.saveCanvas(item)
        },
      })
    } else if (isProject(item)) {
      showInputLine({
        value: item?.name ?? '',
        onEnter: async (value: string) => {
          const name = value.trim() || undefined
          projectService.updateProject(item.id, {name})
        },
      })
    }
  }

  const deleteNode = async (forever = false) => {
    if (!selected) return
    showConfirmDialog({
      title: forever ? 'Delete forever' : 'Delete',
      content: 'Do you want to proceed?',
      onConfirm: async () => {
        const result = await deleteService.delete(selected, forever)
        if (result.navigateTo !== false) locationService.openItem(result.navigateTo)
        dialogService.close(props.dialog)
      },
    })
  }

  const onRestore = async () => {
    if (!selected) return
    if (isFile(selected.value)) {
      await fileService.restore(selected.id)
    } else {
      await canvasService.restore(selected.id)
    }

    dialogService.close(props.dialog)
  }

  return (
    <DialogList>
      <Show when={selected && canvasService.isOnCanvas(selected.id)}>
        <TooltipButton onClick={onFocus} data-testid="focus_file">
          <IconFocus />
          Focus file
        </TooltipButton>
        <TooltipDivider />
      </Show>
      <Show when={isDeletable(selected?.value) && !selected.value.deleted}>
        <TooltipButton onClick={onAddFile} data-testid="add_file">
          <LangIcon name="markdown" />
          Add file
        </TooltipButton>
        <TooltipButton onClick={onAddCanvas} data-testid="add_canvas">
          <IconCanvas />
          Add canvas
        </TooltipButton>
        <TooltipButton onClick={onAddCode} data-testid="add_code">
          <IconCodeBlocks />
          Add code file
        </TooltipButton>
        <TooltipDivider />
      </Show>
      <Show when={selected && !isLocalFile(selected?.value)}>
        <TooltipButton onClick={onRename} data-testid="rename">
          <IconEdit />
          Rename
        </TooltipButton>
      </Show>
      <Switch>
        <Match when={isDeletable(selected?.value) && selected.value.deleted}>
          <TooltipButton onClick={onRestore} data-testid="restore">
            <IconHistory />
            Restore
          </TooltipButton>
          <TooltipButton onClick={() => deleteNode(true)} data-testid="delete_forever">
            <IconDelete />
            Delete forever
          </TooltipButton>
        </Match>
        <Match when={selected && isLocalFile(selected?.value) && !isProjectItem(selected.value)}>
          <TooltipButton onClick={() => deleteNode(true)} data-testid="close">
            <IconClose />
            Close
          </TooltipButton>
        </Match>
        <Match when={isDeletable(selected?.value)}>
          <TooltipButton onClick={() => deleteNode()} data-testid="delete">
            <IconDelete />
            Delete
          </TooltipButton>
        </Match>
      </Switch>
      <Show when={!selected}>
        <TooltipButton onClick={onNewFile} data-testid="new_file">
          <LangIcon name="markdown" />
          New file
        </TooltipButton>
        <TooltipButton onClick={onNewCanvas} data-testid="new_canvas">
          <IconCanvas />
          New canvas
        </TooltipButton>
        <TooltipButton onClick={onNewCode} data-testid="new_code">
          <IconCodeBlocks />
          New code file
        </TooltipButton>
        <TooltipButton onClick={onNewProject} data-testid="new_project">
          <IconFolderRoot />
          New project
        </TooltipButton>
      </Show>
    </DialogList>
  )
}
