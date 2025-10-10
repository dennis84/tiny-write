import {useNavigate} from '@solidjs/router'
import {Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useOpen} from '@/hooks/open'
import {MenuId} from '@/services/MenuService'
import {Page, useState} from '@/state'
import {Button, ButtonGroup, IconButton} from '../Button'
import {
  IconAiAssistant,
  IconAiAssistantClose,
  IconArrowBack,
  IconClose,
  IconFullscreen,
  IconMoreVert,
} from '../Icon'
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

export const ChatNavbar = () => {
  const {store, menuService, threadService} = useState()
  const {open} = useOpen()

  const onAssistantClick = () => {
    if (!store.ai?.copilot?.user) menuService.show(MenuId.AI_CONFIG)
    else menuService.toggleAssistant()
  }

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
      <TooltipHelp title="Expand assistant">
        <IconButton onClick={onExpandClick} data-testid="navbar_assistant_expand">
          <IconFullscreen />
        </IconButton>
      </TooltipHelp>
      <TooltipHelp title="Close assistant">
        <IconButton onClick={onAssistantClick} data-testid="navbar_assistant_close">
          <IconAiAssistantClose />
        </IconButton>
      </TooltipHelp>
    </StickyContainer>
  )
}

export const MenuNavbar = () => {
  const {fileService, menuService} = useState()

  const onMenuButtonClick = () => {
    fileService.currentFile?.editorView?.focus()
    menuService.toggleMenu()
  }

  return (
    <StickyContainer>
      <Show when={menuService.menu() === MenuId.MAIN}>
        <TooltipHelp title="Close menu">
          <IconButton onClick={onMenuButtonClick} data-testid="menu_navbar_close">
            <IconClose />
          </IconButton>
        </TooltipHelp>
      </Show>
      <Show when={menuService.menu() !== MenuId.MAIN}>
        <Button onClick={() => menuService.show(MenuId.MAIN)} data-testid="menu_navbar_back">
          <IconArrowBack /> Back to menu
        </Button>
      </Show>
    </StickyContainer>
  )
}

export const FloatingNavbar = () => {
  const {store, fileService, menuService} = useState()
  const navigate = useNavigate()

  const onAssistantClick = () => {
    if (!store.ai?.copilot?.user) menuService.show(MenuId.AI_CONFIG)
    else menuService.toggleAssistant()
  }

  const onMenuButtonClick = () => {
    fileService.currentFile?.editorView?.focus()
    menuService.toggleMenu()
  }

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
    <FloatingContainer>
      <ButtonGroup>
        <Show when={getBackTitle()}>
          {(title) => (
            <TooltipHelp title={title()}>
              <Button onClick={onBackClick} data-testid="floating_navbar_back">
                <IconArrowBack /> Back
              </Button>
            </TooltipHelp>
          )}
        </Show>

        <Show when={!menuService.assistant() && store.location?.page !== Page.Assistant}>
          <TooltipHelp title="Open Chat">
            <IconButton onClick={onAssistantClick} data-testid="floating_navbar_assistant_open">
              <IconAiAssistant />
            </IconButton>
          </TooltipHelp>
        </Show>

        <Show when={!menuService.menu()}>
          <TooltipHelp title="Open Menu">
            <IconButton onClick={onMenuButtonClick} data-testid="floating_navbar_menu_open">
              <IconMoreVert />
            </IconButton>
          </TooltipHelp>
        </Show>
      </ButtonGroup>
    </FloatingContainer>
  )
}
