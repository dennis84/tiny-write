import {useNavigate} from '@solidjs/router'
import {Match, Show, Suspense, Switch} from 'solid-js'
import {getLanguageNames} from '@/codemirror/highlight'
import {useCollabCount} from '@/hooks/use-collab-count'
import {useConfirmDialog} from '@/hooks/use-confirm-dialog'
import {useDialog} from '@/hooks/use-dialog'
import {useInputLine} from '@/hooks/use-input-line'
import {useTitle} from '@/hooks/use-title'
import {copy} from '@/remote/clipboard'
import {CanvasService} from '@/services/CanvasService'
import {isCodeFile, isLocalFile, useState} from '@/state'
import {Page} from '@/types'
import {Button, ButtonGroup, IconButton} from '../Button'
import {DialogList, TooltipButton, TooltipDivider} from '../dialog/Style'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {IconDarkMode, IconLightMode} from '../icons/DarkMode'
import {IconCanvas, IconFileText} from '../icons/File'
import {LangIcon} from '../icons/LangIcon'
import {IconPrettier} from '../icons/Logo'
import {
  IconArrowBack,
  IconClose,
  IconCloud,
  IconCloudOff,
  IconCopy,
  IconDelete,
  IconEdit,
  IconHistory,
  IconLanguage,
} from '../icons/Ui'
import {AssistantButton} from './AssistantButton'
import {FloatingContainer} from './Style'

const CollabButton = () => {
  const {collabService, dialogService} = useState()
  const collabCount = useCollabCount()

  const Tooltip = () => (
    <DialogList>
      <TooltipButton onClick={onStop}>
        <IconCloudOff />
        Disconnect
      </TooltipButton>
      <TooltipButton onClick={onCopyCollabLink}>
        <IconCopy /> Copy Link
      </TooltipButton>
    </DialogList>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const onOpen = (e: MouseEvent) => {
    showTooltip({anchor: e.currentTarget as HTMLElement})
  }

  const onStop = () => {
    collabService.disconnect()
    closeTooltip()
  }

  const onCopyCollabLink = async () => {
    const joinUrl = collabService.getJoinUrl()
    if (joinUrl) {
      await copy(joinUrl)
      dialogService.toast({message: 'Collab link copied to clipboard', duration: 2000})
    }
    closeTooltip()
  }

  return (
    <Button onClick={onOpen} data-testid="navbar_collab">
      <IconCloud /> {collabCount()}
    </Button>
  )
}

const CurrentFileButton = () => {
  const {codeService, canvasService, deleteService, fileService, treeService, locationService} =
    useState()
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
    treeService.updateAll()
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

const DarkModeToggle = () => {
  const {configService} = useState()

  return (
    <>
      <Show when={configService.theme.dark}>
        <TooltipHelp title="Turn on light mode">
          <IconButton onClick={() => configService.toggleDarkMode()}>
            <IconLightMode />
          </IconButton>
        </TooltipHelp>
      </Show>
      <Show when={!configService.theme.dark}>
        <TooltipHelp title="Turn on dark mode">
          <IconButton onClick={() => configService.toggleDarkMode()}>
            <IconDarkMode />
          </IconButton>
        </TooltipHelp>
      </Show>
    </>
  )
}

const BackButton = () => {
  const {store} = useState()
  const navigate = useNavigate()

  const onBackClick = () => {
    navigate(-1)
  }

  const getBackTitle = () => {
    const prev = store.lastLocation?.pathname
    if (prev?.includes('/editor/')) return 'Back to editor'
    if (prev?.includes('/code/')) return 'Back to code editor'
    if (prev?.includes('/canvas/')) return 'Back to canvas'
    if (prev?.includes('/assistant/')) return 'Back to assistant'
  }

  return (
    <Show when={getBackTitle()}>
      {(backTitle) => (
        <TooltipHelp title={backTitle()}>
          <Button onClick={onBackClick} data-testid="navbar_back">
            <IconArrowBack /> Back
          </Button>
        </TooltipHelp>
      )}
    </Show>
  )
}

export const InfoNavbar = () => {
  const {canvasService, collabService, fileService, locationService, menuService} = useState()

  return (
    <FloatingContainer justify="flex-end">
      <ButtonGroup background={true}>
        <BackButton />
        <DarkModeToggle />
        <Show when={fileService.currentFile || canvasService.currentCanvas}>
          <CurrentFileButton />
        </Show>
        <Show when={collabService?.started()}>
          <CollabButton />
        </Show>
        <Show when={!menuService.assistant() && locationService.page !== Page.Assistant}>
          <AssistantButton />
        </Show>
      </ButtonGroup>
    </FloatingContainer>
  )
}
