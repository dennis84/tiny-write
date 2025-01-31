import {Show, createEffect, onCleanup} from 'solid-js'
import {Mode, useState} from '@/state'
import {isTauri, isMac, mod, shortHash, version, VERSION_URL, isDev} from '@/env'
import {quit} from '@/remote/app'
import {useOpen} from '@/open'
import {MenuId} from '@/services/MenuService'
import {Button, IconButton} from '@/components/Button'
import {Chat} from '@/components/assistant/Chat'
import {
  IconAi,
  IconAiAssistant,
  IconAiAssistantClose,
  IconArrowBack,
  IconClose,
  IconContrast,
  IconDesktopLandscape,
  IconFullscreen,
  IconHistory,
  IconMoreVert,
  IconPrettier,
  IconSpellcheck,
  IconVerticalAlignCenter,
} from '@/components/Icon'
import {TooltipHelp} from '@/components/TooltipHelp'
import {Bin} from './Bin'
import {CodeFormat} from './CodeFormat'
import {Appearance} from './Appearance'
import {ChangeSet} from './ChangeSet'
import {Help} from './Help'
import {AiConfig} from './AiConfig'
import {SubmenuEditor} from './SubmenuEditor'
import {SubmenuCanvas} from './SubmenuCanvas'
import {SubmenuEdit} from './SubmenuEdit'
import {SubmenuCollab} from './SubmenuCollab'
import {SubmenuTree} from './SubmenuTree'
import {SubmenuCode} from './SubmenuCode'
import {fullWidth, Container, Drawer, Keys, Label, Link, Sub, Control} from './Style'

export const Menu = () => {
  const {store, appService, menuService, configService, fileService, prettierService} = useState()
  const {open} = useOpen()

  const modKey = isMac ? '⌘' : mod

  const onMenuButtonClick = () => {
    fileService.currentFile?.editorView?.focus()
    menuService.toggleMenu()
  }

  const onToggleAlwaysOnTop = () => configService.setAlwaysOnTop(!store.config.alwaysOnTop)

  const onToggleTypewriterMode = () =>
    configService.updateConfig({typewriterMode: !store.config.typewriterMode})

  const onToggleSpellcheck = () =>
    configService.updateConfig({spellcheck: !store.config.spellcheck})

  const onToggleFullscreen = () => appService.setFullscreen(!store.fullscreen)

  const onVersion = () => {
    window.open(VERSION_URL, '_blank')
  }

  const onOpenInApp = () => {
    if (isTauri()) return
    const currentFile = fileService.currentFile
    if (store.collab?.started) {
      window.open(`tinywrite://main?room=${currentFile?.id}`, '_self')
    } else {
      const state = currentFile?.editorView?.state
      if (!state) return
      const text = window.btoa(JSON.stringify(state.toJSON()))
      window.open(`tinywrite://main?text=${text}`, '_self')
    }
  }

  const onReset = async () => {
    await appService.reset()
    open(undefined)
  }

  const maybeHide = () => {
    if (window.innerWidth <= fullWidth) menuService.hide()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') menuService.hide()
  }

  createEffect(() => {
    if (!menuService.menu()) return
    document.addEventListener('keydown', onKeyDown)
  })

  onCleanup(() => document.removeEventListener('keydown', onKeyDown))

  const showCodeFormat = () => {
    const currentFile = fileService.currentFile
    if (!currentFile?.codeEditorView) return true
    return prettierService.supports(currentFile.codeLang ?? '')
  }

  const onAssistantClick = () => {
    if (!store.ai?.copilot?.user) menuService.show(MenuId.AI_CONFIG)
    else menuService.toggleAssistant()
  }

  return (
    <Container>
      <Control active={menuService.menu() !== undefined || menuService.assistant() !== undefined}>
        <TooltipHelp title={menuService.assistant() ? 'Close Chat' : 'Open Chat'}>
          <IconButton onClick={onAssistantClick}>
            {menuService.assistant() ?
              <IconAiAssistantClose />
            : <IconAiAssistant />}
          </IconButton>
        </TooltipHelp>
        <Show when={!menuService.menu() || menuService.menu() === MenuId.MAIN}>
          <TooltipHelp title={menuService.menu() ? 'Close Menu' : 'Open Menu'}>
            <IconButton onClick={onMenuButtonClick} data-testid="menu_button">
              {menuService.menu() ?
                <IconClose />
              : <IconMoreVert />}
            </IconButton>
          </TooltipHelp>
        </Show>
        <Show when={menuService.menu() !== undefined && menuService.menu() !== 'main'}>
          <Button onClick={() => menuService.show(MenuId.MAIN)} data-testid="menu_back_button">
            <IconArrowBack /> Back
          </Button>
        </Show>
      </Control>
      <Show when={menuService.assistant()}>
        <Chat />
      </Show>
      <Show when={menuService.menu() === MenuId.BIN}>
        <Bin />
      </Show>
      <Show when={menuService.menu() === MenuId.CODE_FORMAT}>
        <CodeFormat />
      </Show>
      <Show when={menuService.menu() === MenuId.APPEARANCE}>
        <Appearance />
      </Show>
      <Show when={menuService.menu() === MenuId.HELP}>
        <Help />
      </Show>
      <Show when={menuService.menu() === MenuId.CHANGE_SET}>
        <ChangeSet />
      </Show>
      <Show when={menuService.menu() === MenuId.AI_CONFIG}>
        <AiConfig />
      </Show>
      <Show when={menuService.menu() === MenuId.MAIN}>
        <Drawer
          onClick={() => fileService.currentFile?.editorView?.focus()}
          data-tauri-drag-region="true"
        >
          <SubmenuTree onBin={() => menuService.show(MenuId.BIN)} maybeHide={maybeHide} />
          {/* Submenu File */}
          <Show when={store.mode === Mode.Editor}>
            <SubmenuEditor />
          </Show>
          {/* Submenu Canvas */}
          <Show when={store.mode === Mode.Canvas}>
            <SubmenuCanvas maybeHide={maybeHide} />
          </Show>
          {/* Submenu Code */}
          <Show when={store.mode === Mode.Code}>
            <SubmenuCode />
          </Show>
          {/* undo, redo, copy, paste, ... */}
          <SubmenuEdit />
          {/* Submenu View */}
          <Label>View</Label>
          <Sub data-tauri-drag-region="true">
            <Link data-testid="appearance" onClick={() => menuService.show(MenuId.APPEARANCE)}>
              <IconContrast /> Appearance
            </Link>
            <Show when={showCodeFormat()}>
              <Link onClick={() => menuService.show(MenuId.CODE_FORMAT)}>
                <IconPrettier /> Code Format
              </Link>
            </Show>
            <Show when={store.mode === Mode.Editor}>
              <Link onClick={() => menuService.show(MenuId.CHANGE_SET)}>
                <IconHistory /> Change Set
              </Link>
            </Show>
            <Show when={isTauri()}>
              <Link onClick={onToggleFullscreen}>
                <IconFullscreen /> Fullscreen {store.fullscreen && '✅'}{' '}
                <Keys keys={[modKey, 'Enter']} />
              </Link>
            </Show>
            <Show when={store.mode === Mode.Editor}>
              <Link onClick={onToggleTypewriterMode}>
                <IconVerticalAlignCenter /> Typewriter mode {store.config.typewriterMode && '✅'}
              </Link>
              <Link onClick={onToggleSpellcheck}>
                <IconSpellcheck /> Spellcheck {store.config.spellcheck && '✅'}
              </Link>
            </Show>
            <Show when={isTauri()}>
              <Link onClick={onToggleAlwaysOnTop}>
                <IconDesktopLandscape /> Always on Top {store.config.alwaysOnTop && '✅'}
              </Link>
            </Show>
          </Sub>
          {/* Submenu Collab */}
          <SubmenuCollab />
          {/* Submenu Ai */}
          <Label>AI</Label>
          <Sub data-tauri-drag-region="true">
            <Link onClick={() => menuService.show(MenuId.AI_CONFIG)}>
              <IconAi /> Configure
            </Link>
            <Show when={store.ai?.copilot?.user}>
              <Link onClick={() => menuService.toggleAssistant()}>
                <IconAiAssistant /> Assistant
              </Link>
            </Show>
          </Sub>
          {/* Submenu Application */}
          <Label>Application</Label>
          <Sub data-tauri-drag-region="true">
            {/* doesn't work with tauri */}
            <Show when={!isTauri() && false}>
              <Link onClick={onOpenInApp}>Open in App ⚡</Link>
            </Show>
            <Link onClick={onVersion}>
              About Version {version} ({shortHash})
            </Link>
            <Link onClick={() => menuService.show(MenuId.HELP)}>Help</Link>
            <Show when={isTauri()}>
              <Link onClick={() => quit()}>
                Quit <Keys keys={[modKey, 'q']} />
              </Link>
            </Show>
            <Show when={isDev}>
              <Link onClick={onReset}>Reset DB</Link>
            </Show>
          </Sub>
        </Drawer>
      </Show>
    </Container>
  )
}
