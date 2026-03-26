import {Match, Show, Suspense, Switch} from 'solid-js'
import {getLanguageNames} from '@/codemirror/highlight'
import {useConfirmDialog} from '@/hooks/use-confirm-dialog'
import {useDialog} from '@/hooks/use-dialog'
import {useInputLine} from '@/hooks/use-input-line'
import {useTitle} from '@/hooks/use-title'
import {CanvasService} from '@/services/CanvasService'
import {isCodeFile, isLocalFile, useState} from '@/state'
import {Button} from '../Button'
import {DialogList, TooltipButton, TooltipDivider} from '../dialog/Style'
import {IconCanvas, IconFileText} from '../icons/File'
import {LangIcon} from '../icons/LangIcon'
import {IconPrettier} from '../icons/Logo'
import {IconClose, IconDelete, IconEdit, IconHistory, IconLanguage} from '../icons/Ui'

export const CurrentFileButton = () => {
  const {codeService, canvasService, deleteService, fileService, locationService} = useState()
  const showInputLine = useInputLine()
  const showConfirmDialog = useConfirmDialog()

  const title = useTitle()

  const Tooltip = () => (
    <DialogList>
      <Show when={isCodeFile(fileService.currentFile)}>
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
      <TooltipButton onClick={onRename}>
        <IconEdit />
        Rename
      </TooltipButton>
      <Switch>
        <Match when={fileService.currentFile?.deleted}>
          <TooltipButton onClick={onRestore}>
            <IconHistory />
            Restore
          </TooltipButton>
        </Match>
        <Match when={isLocalFile(fileService.currentFile)}>
          <TooltipButton onClick={() => deleteItem(true)}>
            <IconClose />
            Close
          </TooltipButton>
        </Match>
        <Match when={true}>
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
    <Button onClick={onOpen}>
      <Switch>
        {/* 2nd condition for rerendering */}
        <Match
          when={
            isCodeFile(fileService.currentFile) &&
            (fileService.currentFile?.codeLang || !fileService.currentFile?.codeLang)
          }
          keyed
        >
          <LangIcon name={fileService.currentFile?.codeLang} />
        </Match>
        <Match when={fileService.currentFile}>
          <IconFileText />
        </Match>
        <Match when={canvasService.currentCanvas}>
          <IconCanvas />
        </Match>
      </Switch>
      <Suspense>{title()}</Suspense>
    </Button>
  )
}
