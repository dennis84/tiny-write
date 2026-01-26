import {useNavigate} from '@solidjs/router'
import {Match, Show, Suspense, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {getLanguageNames} from '@/codemirror/highlight'
import {useCollabCount} from '@/hooks/use-collab-count'
import {useConfirmDialog} from '@/hooks/use-confirm-dialog'
import {useDialog} from '@/hooks/use-dialog'
import {useInputLine} from '@/hooks/use-input-line'
import {useOpen} from '@/hooks/use-open'
import {useTitle} from '@/hooks/use-title'
import {copy} from '@/remote/clipboard'
import {CanvasService} from '@/services/CanvasService'
import {MenuId} from '@/services/MenuService'
import {isCodeFile, isLocalFile, useState} from '@/state'
import {Page} from '@/types'
import {Button, ButtonGroup, IconButton} from '../Button'
import {TooltipButton, TooltipDivider} from '../dialog/Style'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {
  IconAiAssistant,
  IconAiAssistantClose,
  IconArrowBack,
  IconClose,
  IconCloud,
  IconCloudOff,
  IconDarkMode,
  IconDelete,
  IconEdit,
  IconFullscreen,
  IconGesture,
  IconHistory,
  IconLanguage,
  IconLightMode,
  IconLink,
  IconMoreVert,
  IconPrettier,
  IconTextSnippet,
  LangIcon,
} from '../Icon'

const FloatingContainer = styled('div')`
  position: absolute;
  top: 0;
  right: 0;
  z-index: var(--z-index-max);
  display: flex;
  align-items: center;
  padding: 5px;
`

const StickyContainer = styled('div')`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 5px;
`

const CollabButton = () => {
  const {collabService, toastService} = useState()
  const collabCount = useCollabCount()

  const Tooltip = () => (
    <>
      <TooltipButton onClick={onStop}>
        <IconCloudOff />
        Disconnect
      </TooltipButton>
      <TooltipButton onClick={onCopyCollabLink}>
        <IconLink /> Copy Link
      </TooltipButton>
    </>
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
      toastService.open({message: 'Collab link copied to clipboard', duration: 2000})
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
  const {codeService, canvasService, deleteService, fileService, treeService} = useState()
  const {openFile} = useOpen()
  const showInputLine = useInputLine()
  const showConfirmDialog = useConfirmDialog()

  const title = useTitle()

  const Tooltip = () => (
    <>
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
    </>
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
          await fileService.renameFile(file.id, value)
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
        if (result.navigateTo !== false) openFile(result.navigateTo)
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
          <IconTextSnippet />
        </Match>
        <Match when={canvasService.currentCanvas}>
          <IconGesture />
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

const AssistantButton = () => {
  const {store, menuService} = useState()

  const onAssistantClick = async () => {
    if (!store.ai?.copilot?.user) menuService.show(MenuId.AI_CONFIG)
    else await menuService.toggleAssistant()
  }

  return (
    <>
      <Show when={!menuService.assistant()}>
        <TooltipHelp title="Open Chat">
          <IconButton onClick={onAssistantClick} data-testid="navbar_assistant_open">
            <IconAiAssistant />
          </IconButton>
        </TooltipHelp>
      </Show>
      <Show when={menuService.assistant()}>
        <TooltipHelp title="Close assistant">
          <IconButton active={true} onClick={onAssistantClick} data-testid="navbar_assistant_close">
            <IconAiAssistantClose />
          </IconButton>
        </TooltipHelp>
      </Show>
    </>
  )
}

const MenuButton = () => {
  const {fileService, menuService} = useState()

  const onMenuButtonClick = () => {
    fileService.currentFile?.editorView?.focus()
    menuService.toggleMenu()
  }

  return (
    <>
      <Show when={!menuService.menu()}>
        <TooltipHelp title="Open Menu">
          <IconButton onClick={onMenuButtonClick} data-testid="navbar_menu_open">
            <IconMoreVert />
          </IconButton>
        </TooltipHelp>
      </Show>
      <Show when={menuService.menu()}>
        <TooltipHelp title="Close menu">
          <IconButton
            active={menuService.menu() === MenuId.MAIN}
            onClick={onMenuButtonClick}
            data-testid="menu_navbar_close"
          >
            <IconClose />
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
    const prev = store.location?.prev
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

export const ChatNavbar = () => {
  const {menuService, threadService} = useState()
  const {open} = useOpen()

  const onExpandClick = async () => {
    // Get current thread before resetting in state
    const currentThread = threadService.currentThread
    // Resets the threadId in state
    await menuService.toggleAssistant()

    if (currentThread?.lastModified) {
      open({threadId: currentThread.id})
    } else {
      open({page: Page.Assistant})
    }
  }

  return (
    <StickyContainer>
      <ButtonGroup>
        <TooltipHelp title="Expand assistant">
          <IconButton onClick={onExpandClick} data-testid="navbar_assistant_expand">
            <IconFullscreen />
          </IconButton>
        </TooltipHelp>
        <AssistantButton />
        <Show when={!menuService.menu()}>
          <DarkModeToggle />
          <MenuButton />
        </Show>
      </ButtonGroup>
    </StickyContainer>
  )
}

export const MenuNavbar = () => {
  const {menuService} = useState()

  return (
    <StickyContainer>
      <ButtonGroup>
        <DarkModeToggle />
        <Show when={menuService.menu() !== MenuId.MAIN}>
          <TooltipHelp title="Back to main menu">
            <IconButton
              onClick={() => menuService.show(MenuId.MAIN)}
              active={true}
              data-testid="menu_navbar_back"
            >
              <IconArrowBack />
            </IconButton>
          </TooltipHelp>
        </Show>
        <Show when={menuService.menu()}>
          <MenuButton />
        </Show>
      </ButtonGroup>
    </StickyContainer>
  )
}

export const FloatingNavbar = () => {
  const {store, canvasService, collabService, fileService, menuService} = useState()

  return (
    <FloatingContainer>
      <ButtonGroup>
        <BackButton />
        <Show when={fileService.currentFile || canvasService.currentCanvas}>
          <CurrentFileButton />
        </Show>
        <Show when={collabService?.started()}>
          <CollabButton />
        </Show>
        <Show when={!menuService.assistant() && store.location?.page !== Page.Assistant}>
          <AssistantButton />
        </Show>
        <Show when={!menuService.menu() && !menuService.assistant()}>
          <DarkModeToggle />
          <MenuButton />
        </Show>
      </ButtonGroup>
    </FloatingContainer>
  )
}
