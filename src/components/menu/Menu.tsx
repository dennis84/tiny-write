import {type JSX, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {isDev, isMac, isTauri, mod, shortHash, VERSION_URL, version} from '@/env'
import {quit} from '@/remote/app'
import {SubmenuId} from '@/services/MenuService'
import {useState} from '@/state'
import {Page} from '@/types'
import {Drawer, DrawerContent, DrawerScroll} from '../Drawer'
import {IconAi, IconAiAssistant} from '../icons/Ai'
import {IconPrettier} from '../icons/Logo'
import {
  IconAlwaysOnTop,
  IconFocus,
  IconFullscreen,
  IconHistory,
  IconPalette,
  IconSpellcheck,
} from '../icons/Ui'
import {MenuNavbar} from '../navbar/MenuNavbar'
import {AiConfig} from './AiConfig'
import {Appearance} from './Appearance'
import {Bin} from './Bin'
import {ChangeSet} from './ChangeSet'
import {CodeFormat} from './CodeFormat'
import {Help} from './Help'
import {Link} from './Link'
import {Container, Label, Sub} from './Style'
import {SubmenuCanvas} from './SubmenuCanvas'
import {SubmenuCode} from './SubmenuCode'
import {SubmenuCollab} from './SubmenuCollab'
import {SubmenuEdit} from './SubmenuEdit'
import {SubmenuEditor} from './SubmenuEditor'
import {SubmenuTree} from './SubmenuTree'

const DrawerEl = styled(Drawer)`
  padding-top: 32px;
`

export const MenuDrawer = ({children}: {children: JSX.Element}) => {
  const {menuService, fileService} = useState()
  const onClick = () => {
    fileService.currentFile?.editorView?.focus()
  }

  return (
    <DrawerEl
      left={true}
      onClick={onClick}
      onResized={(width) => menuService.setMenuWidth(width)}
      width={menuService.menuWidth}
    >
      {children}
    </DrawerEl>
  )
}

export const Menu = () => {
  const {
    store,
    locationService,
    appService,
    collabService,
    menuService,
    configService,
    fileService,
    prettierService,
  } = useState()

  const modKey = isMac ? '⌘' : mod

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
    if (collabService.started()) {
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
    window.location.href = '/'
  }

  const onToggleAssistant = () => {
    const status = menuService.toggleAssistant()
    if (!status) locationService.updateState({threadId: undefined})
  }

  const showCodeFormat = () => {
    const currentFile = fileService.currentFile
    if (!currentFile?.codeEditorView) return true
    return prettierService.supports(currentFile.codeLang ?? '')
  }

  return (
    <>
      <Show when={!menuService.menuOpen}>
        <MenuNavbar />
      </Show>
      <Container>
        <Show when={menuService.submenu() === SubmenuId.BIN}>
          <Bin />
        </Show>
        <Show when={menuService.submenu() === SubmenuId.CODE_FORMAT}>
          <CodeFormat />
        </Show>
        <Show when={menuService.submenu() === SubmenuId.APPEARANCE}>
          <Appearance />
        </Show>
        <Show when={menuService.submenu() === SubmenuId.HELP}>
          <Help />
        </Show>
        <Show when={menuService.submenu() === SubmenuId.CHANGE_SET}>
          <ChangeSet />
        </Show>
        <Show when={menuService.submenu() === SubmenuId.AI_CONFIG}>
          <AiConfig />
        </Show>
        <Show when={menuService.menuOpen && !menuService.submenu()}>
          <MenuDrawer>
            <MenuNavbar />
            <DrawerScroll>
              <DrawerContent>
                <SubmenuTree onBin={() => menuService.setSubmenu(SubmenuId.BIN)} />
                {/* Submenu File */}
                <Show when={locationService.page === Page.Editor}>
                  <SubmenuEditor />
                </Show>
                {/* Submenu Canvas */}
                <Show when={locationService.page === Page.Canvas}>
                  <SubmenuCanvas />
                </Show>
                {/* Submenu Code */}
                <Show when={locationService.page === Page.Code}>
                  <SubmenuCode />
                </Show>
                {/* undo, redo, copy, paste, ... */}
                <Show when={locationService.page !== Page.Assistant}>
                  <SubmenuEdit />
                </Show>
                {/* Submenu View */}
                <Label>View</Label>
                <Sub data-tauri-drag-region="true">
                  <Link
                    data-testid="appearance"
                    onClick={() => menuService.setSubmenu(SubmenuId.APPEARANCE)}
                  >
                    <IconPalette /> Appearance
                  </Link>
                  <Show when={showCodeFormat()}>
                    <Link onClick={() => menuService.setSubmenu(SubmenuId.CODE_FORMAT)}>
                      <IconPrettier /> Code Format
                    </Link>
                  </Show>
                  <Show when={locationService.page === Page.Editor && locationService.editorId}>
                    <Link onClick={() => menuService.setSubmenu(SubmenuId.CHANGE_SET)}>
                      <IconHistory /> Change Set
                    </Link>
                  </Show>
                  <Show when={isTauri()}>
                    <Link
                      onClick={onToggleFullscreen}
                      checked={store.fullscreen}
                      keys={[modKey, 'Enter']}
                    >
                      <IconFullscreen /> Fullscreen
                    </Link>
                  </Show>
                  <Show when={locationService.page === Page.Editor}>
                    <Link onClick={onToggleTypewriterMode} checked={store.config.typewriterMode}>
                      <IconFocus /> Typewriter mode
                    </Link>
                    <Link onClick={onToggleSpellcheck} checked={store.config.spellcheck}>
                      <IconSpellcheck /> Spellcheck
                    </Link>
                  </Show>
                  <Show when={isTauri()}>
                    <Link onClick={onToggleAlwaysOnTop} checked={store.config.alwaysOnTop}>
                      <IconAlwaysOnTop /> Always on Top
                    </Link>
                  </Show>
                </Sub>
                {/* Submenu Collab */}
                <SubmenuCollab />
                {/* Submenu Ai */}
                <Label>AI</Label>
                <Sub data-tauri-drag-region="true">
                  <Link onClick={() => menuService.setSubmenu(SubmenuId.AI_CONFIG)}>
                    <IconAi /> Configure
                  </Link>
                  <Show when={store.ai?.copilot?.user}>
                    <Link onClick={onToggleAssistant}>
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
                  <Link onClick={() => menuService.setSubmenu(SubmenuId.HELP)}>Help</Link>
                  <Show when={isTauri()}>
                    <Link onClick={() => quit()} keys={[modKey, 'q']}>
                      Quit
                    </Link>
                  </Show>
                  <Show when={isDev}>
                    <Link onClick={onReset}>Reset DB</Link>
                  </Show>
                </Sub>
              </DrawerContent>
            </DrawerScroll>
          </MenuDrawer>
        </Show>
      </Container>
    </>
  )
}
