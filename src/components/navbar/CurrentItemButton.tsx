import {Match, Show, Suspense, Switch} from 'solid-js'
import {getLanguageNames} from '@/codemirror/highlight'
import {useConfirmDialog} from '@/hooks/use-confirm-dialog'
import {useDialog} from '@/hooks/use-dialog'
import {useInputLine} from '@/hooks/use-input-line'
import {useTitle} from '@/hooks/use-title'
import {saveFile} from '@/remote/editor'
import {info} from '@/remote/log'
import {CanvasService} from '@/services/CanvasService'
import {isCanvas, isDeletable, isFile, isLocalFile, isProjectItem, useState} from '@/state'
import {Button} from '../Button'
import {DialogList, TooltipButton, TooltipDivider} from '../dialog/Style'
import {IconCanvas, IconSaveAs} from '../icons/File'
import {LangIcon} from '../icons/LangIcon'
import {IconPrettier} from '../icons/Logo'
import {
  IconCheckBox,
  IconClose,
  IconDelete,
  IconEdit,
  IconFocus,
  IconGrid,
  IconHistory,
  IconLanguage,
} from '../icons/Ui'

export const CurrentItemButton = () => {
  const {
    codeService,
    canvasService,
    canvasCollabService,
    deleteService,
    fileService,
    locationService,
  } = useState()
  const showInputLine = useInputLine()
  const showConfirmDialog = useConfirmDialog()

  const title = useTitle()

  const onSaveAs = async () => {
    const currentFile = fileService.currentFile
    if (!currentFile) return
    try {
      const path = await saveFile(currentFile)
      if (path) await fileService.updatePath(currentFile.id, path)
    } catch (e) {
      info(`Save as cancelled`, e)
    }
  }

  const onClearCanvas = async () => {
    showConfirmDialog({
      title: 'Clear Canvas',
      content: 'Are you sure you want to clear the canvas?',
      onConfirm: async () => {
        await canvasService.clearCanvas()
        canvasCollabService.removeAll()
      },
    })
  }

  const onBackToContent = async () => {
    await canvasService.backToContent()
  }

  const onSnapToGrid = () => {
    canvasService.snapToGrid()
  }

  const Tooltip = () => (
    <DialogList>
      {/* Only code */}
      <Show when={isFile(fileService.currentFile) && fileService.currentFile?.code}>
        <TooltipButton onClick={onChangeLanguage}>
          <IconLanguage />
          Change Language
        </TooltipButton>
        <TooltipButton onClick={onFormat}>
          <IconPrettier />
          Prettify
        </TooltipButton>
        <TooltipDivider />
      </Show>
      {/* Only canvas */}
      <Show when={isCanvas(canvasService.currentCanvas)}>
        <TooltipButton onClick={onClearCanvas} data-testid="clear_canvas">
          <IconClose />
          Clear canvas
        </TooltipButton>
        <TooltipButton onClick={onBackToContent}>
          <IconFocus />
          Back to content
        </TooltipButton>
        <TooltipButton onClick={onSnapToGrid}>
          <IconGrid />
          Snap to grid
          <Show when={canvasService.currentCanvas?.snapToGrid}>
            <IconCheckBox />
          </Show>
        </TooltipButton>
        <TooltipDivider />
      </Show>
      <Show when={!isLocalFile(fileService.currentFile) && !isProjectItem(fileService.currentFile)}>
        <TooltipButton onClick={onRename}>
          <IconEdit />
          Rename
        </TooltipButton>
        <Show when={fileService.currentFile}>
          <TooltipButton onClick={onSaveAs}>
            <IconSaveAs />
            Save as
          </TooltipButton>
        </Show>
      </Show>
      <Switch>
        <Match when={fileService.currentFile?.deleted}>
          <TooltipButton onClick={onRestore}>
            <IconHistory />
            Restore
          </TooltipButton>
        </Match>
        <Match
          when={isLocalFile(fileService.currentFile) && !isProjectItem(fileService.currentFile)}
        >
          <TooltipButton onClick={() => deleteItem(true)}>
            <IconClose />
            Close
          </TooltipButton>
        </Match>
        <Match when={isDeletable(fileService.currentFile)}>
          <TooltipButton onClick={() => deleteItem()}>
            <IconDelete />
            Delete
          </TooltipButton>
        </Match>
      </Switch>
    </DialogList>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const focus = () => {
    fileService.currentFile?.editorView?.focus()
    fileService.currentFile?.codeEditorView?.focus()
  }

  const onOpen = (e: MouseEvent) => {
    showTooltip({anchor: e.currentTarget as HTMLElement})
  }

  const onRename = async () => {
    closeTooltip()

    const file = fileService.currentFile
    const canvas = canvasService.currentCanvas

    if (file) {
      const filename = await fileService.getFilename(file)
      showInputLine({
        value: filename ?? '',
        onEnter: async (value: string) => {
          const updatedFile = await fileService.renameFile(file.id, value)
          if (updatedFile?.codeLang) codeService.updateLang(updatedFile, updatedFile.codeLang)
        },
      })
    } else if (canvas) {
      showInputLine({
        value: canvas?.title ?? '',
        onEnter: async (value: string) => {
          canvasService.updateCanvas(canvas.id, {title: value.trim() || undefined})
          await CanvasService.saveCanvas(canvas)
        },
      })
    }
  }

  const deleteItem = async (forever = false) => {
    const currentFile = fileService.currentFile
    if (!currentFile) return
    showConfirmDialog({
      title: forever ? 'Delete file permanently' : 'Delete file',
      content: 'Do you want to proceed?',
      onConfirm: async () => {
        const result = await deleteService.deleteItem(currentFile, forever)
        if (result.navigateTo !== false) locationService.openItem(result.navigateTo)
        closeTooltip()
      },
    })
  }

  const onRestore = async () => {
    const currentFile = fileService.currentFile
    if (!currentFile) return
    fileService.restore(currentFile.id)
    closeTooltip()
  }

  const onChangeLanguage = () => {
    const file = fileService.currentFile
    if (!file) return
    closeTooltip()
    showInputLine({
      value: file.codeLang ?? '',
      words: getLanguageNames(),
      onEnter: (lang) => {
        codeService.updateLang(file, lang)
        focus()
      },
    })
  }

  const onFormat = async () => {
    const file = fileService.currentFile
    if (!file) return
    closeTooltip()
    await codeService.prettify(file)
    focus()
  }

  return (
    <Button onClick={onOpen} data-testid="current_item_button">
      <Switch>
        {/* 3rd condition for rerendering */}
        <Match
          when={
            isFile(fileService.currentFile) &&
            fileService.currentFile.code &&
            (fileService.currentFile?.codeLang || !fileService.currentFile?.codeLang)
          }
          keyed
        >
          <LangIcon name={fileService.currentFile?.codeLang} />
        </Match>
        <Match when={fileService.currentFile}>
          <LangIcon name="markdown" />
        </Match>
        <Match when={canvasService.currentCanvas}>
          <IconCanvas />
        </Match>
      </Switch>
      <Suspense>{title()}</Suspense>
    </Button>
  )
}
