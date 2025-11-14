import {useNavigate} from '@solidjs/router'
import {createEffect, createSignal, Match, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {getLanguageNames} from '@/codemirror/highlight'
import {useOpen} from '@/hooks/open'
import {CanvasService} from '@/services/CanvasService'
import {MenuId} from '@/services/MenuService'
import {isCodeFile, Page, useState} from '@/state'
import {Button, ButtonGroup, IconButton} from '../Button'
import {
  IconAiAssistant,
  IconAiAssistantClose,
  IconArrowBack,
  IconClose,
  IconDarkMode,
  IconFullscreen,
  IconGesture,
  IconLightMode,
  IconMoreVert,
  IconTextSnippet,
  LangIcon,
} from '../Icon'
import {Tooltip, TooltipButton} from '../Tooltip'
import {TooltipHelp} from '../TooltipHelp'

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

const CurrentFileButton = () => {
  const {codeService, canvasService, fileService, inputLineService} = useState()
  const [title, setTitle] = createSignal<string | undefined>(undefined)
  const [anchor, setAnchor] = createSignal<HTMLElement>()

  const closeTooltip = () => {
    setAnchor(undefined)
  }

  const focus = () => {
    fileService.currentFile?.editorView?.focus()
    fileService.currentFile?.codeEditorView?.focus()
  }

  const onOpen = (e: MouseEvent) => {
    setAnchor(e.currentTarget as HTMLElement)
  }

  const onRename = async () => {
    closeTooltip()

    const file = fileService.currentFile
    const canvas = canvasService.currentCanvas

    if (file) {
      const title = await fileService.getFileName(file)
      inputLineService.setInputLine({
        value: title ?? '',
        onEnter: async (value: string) => {
          await fileService.renameFile(file.id, value)
        },
      })
    } else if (canvas) {
      inputLineService.setInputLine({
        value: canvas?.title ?? '',
        onEnter: async (value: string) => {
          const title = value.trim() || undefined
          canvasService.updateCanvas(canvas.id, {title})
          await CanvasService.saveCanvas(canvas)
        },
      })
    }
  }

  const onChangeLanguage = () => {
    const file = fileService.currentFile
    if (!file) return
    closeTooltip()
    inputLineService.setInputLine({
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

  createEffect(async () => {
    if (fileService.currentFile) {
      setTitle(await fileService.getTitle(fileService.currentFile))
    } else if (canvasService.currentCanvas) {
      setTitle(canvasService.currentCanvas.title ?? 'Canvas')
    }
  })

  return (
    <>
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
        {title()}
      </Button>
      <Show when={anchor()}>
        {(a) => (
          <Tooltip anchor={a()} backdrop={false} onClose={closeTooltip}>
            <TooltipButton onClick={onRename}>Rename</TooltipButton>
            <Show when={isCodeFile(fileService.currentFile)}>
              <TooltipButton onClick={onChangeLanguage}>Change Language</TooltipButton>
              <TooltipButton onClick={onFormat}>Prettify</TooltipButton>
            </Show>
          </Tooltip>
        )}
      </Show>
    </>
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

  const onAssistantClick = () => {
    if (!store.ai?.copilot?.user) menuService.show(MenuId.AI_CONFIG)
    else menuService.toggleAssistant()
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
      {(title) => (
        <TooltipHelp title={title()}>
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

  const onExpandClick = () => {
    // Get current thread before resetting in state
    const currentThread = threadService.currentThread
    // Resets the threadId in state
    menuService.toggleAssistant()

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
  const {store, canvasService, fileService, menuService} = useState()

  return (
    <FloatingContainer>
      <ButtonGroup>
        <BackButton />
        <Show when={fileService.currentFile || canvasService.currentCanvas}>
          <CurrentFileButton />
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
