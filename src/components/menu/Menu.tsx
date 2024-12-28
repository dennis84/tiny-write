import {Match, Show, Switch, createEffect, createSignal, onCleanup} from 'solid-js'
import {Mode, useState} from '@/state'
import {isTauri, isMac, mod, shortHash, version, VERSION_URL, isDev} from '@/env'
import {quit} from '@/remote/app'
import {useOpen} from '@/open'
import {Button, IconButton} from '@/components/Button'
import {Bin} from './Bin'
import {CodeFormat} from './CodeFormat'
import {Appearance} from './Appearance'
import {ChangeSet} from './ChangeSet'
import {Help} from './Help'
import {AiConfig} from './AiConfig'
import {Chat} from '../assistant/Chat'
import {SubmenuEditor} from './SubmenuEditor'
import {SubmenuCanvas} from './SubmenuCanvas'
import {SubmenuEdit} from './SubmenuEdit'
import {SubmenuCollab} from './SubmenuCollab'
import {SubmenuTree} from './SubmenuTree'
import {SubmenuCode} from './SubmenuCode'
import {Icon, IconAi, IconAiAssistant, IconPrettier} from '../Icon'
import {fullWidth, Container, Drawer, Keys, Label, Link, Sub, Control} from './Style'

export const Menu = () => {
  const {store, appService, configService, fileService, prettierService} = useState()
  const [show, setShow] = createSignal()
  const {open} = useOpen()

  const modKey = isMac ? '⌘' : mod

  const onMenuButtonClick = () => {
    fileService.currentFile?.editorView?.focus()
    setShow(show() ? undefined : 'main')
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
    if (window.innerWidth <= fullWidth) setShow(undefined)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setShow(undefined)
  }

  createEffect(() => {
    if (!show()) return
    document.addEventListener('keydown', onKeyDown)
  })

  onCleanup(() => document.removeEventListener('keydown', onKeyDown))

  const showCodeFormat = () => {
    const currentFile = fileService.currentFile
    if (!currentFile?.codeEditorView) return true
    const language = currentFile.codeEditorView.contentDOM.dataset.language ?? ''
    return prettierService.supports(language)
  }

  return (
    <Container>
      <Control active={show() !== undefined}>
        <Switch>
          <Match when={show() === undefined}>
            <Show when={store.ai?.copilot?.enabled}>
              <IconButton onClick={() => setShow('ai_assistant')}>
                <IconAiAssistant />
              </IconButton>
            </Show>
            <IconButton onClick={onMenuButtonClick} data-testid="menu_button">
              <Icon>more_vert</Icon>
            </IconButton>
          </Match>
          <Match when={show() === 'main'}>
            <IconButton onClick={onMenuButtonClick} data-testid="menu_button">
              <Icon>close</Icon>
            </IconButton>
          </Match>
          <Match when={show() !== undefined && show() !== 'main'}>
            <Button onClick={() => setShow('main')} data-testid="menu_back_button">
              <Icon>arrow_back</Icon> Back
            </Button>
          </Match>
        </Switch>
      </Control>
      <Show when={show() === 'bin'}>
        <Bin />
      </Show>
      <Show when={show() === 'code_format'}>
        <CodeFormat />
      </Show>
      <Show when={show() === 'theme'}>
        <Appearance />
      </Show>
      <Show when={show() === 'help'}>
        <Help />
      </Show>
      <Show when={show() === 'change_set'}>
        <ChangeSet />
      </Show>
      <Show when={show() === 'ai_config'}>
        <AiConfig />
      </Show>
      <Show when={show() === 'ai_assistant'}>
        <Chat />
      </Show>
      <Show when={show() === 'main'}>
        <Drawer
          onClick={() => fileService.currentFile?.editorView?.focus()}
          data-tauri-drag-region="true"
        >
          <SubmenuTree onBin={() => setShow('bin')} maybeHide={maybeHide} />
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
            <Link data-testid="appearance" onClick={() => setShow('theme')}>
              <Icon>contrast</Icon> Appearance
            </Link>
            <Show when={showCodeFormat()}>
              <Link onClick={() => setShow('code_format')}>
                <IconPrettier /> Code Format
              </Link>
            </Show>
            <Show when={store.mode === Mode.Editor}>
              <Link onClick={() => setShow('change_set')}>
                <Icon>history</Icon> Change Set
              </Link>
            </Show>
            <Show when={isTauri()}>
              <Link onClick={onToggleFullscreen}>
                <Icon>fullscreen</Icon> Fullscreen {store.fullscreen && '✅'}{' '}
                <Keys keys={[modKey, 'Enter']} />
              </Link>
            </Show>
            <Show when={store.mode === Mode.Editor}>
              <Link onClick={onToggleTypewriterMode}>
                <Icon>vertical_align_center</Icon> Typewriter mode{' '}
                {store.config.typewriterMode && '✅'}
              </Link>
              <Link onClick={onToggleSpellcheck}>
                <Icon>spellcheck</Icon> Spellcheck {store.config.spellcheck && '✅'}
              </Link>
            </Show>
            <Show when={isTauri()}>
              <Link onClick={onToggleAlwaysOnTop}>
                <Icon>desktop_landscape</Icon> Always on Top {store.config.alwaysOnTop && '✅'}
              </Link>
            </Show>
          </Sub>
          {/* Submenu Collab */}
          <SubmenuCollab />
          {/* Submenu Ai */}
          <Show when={isTauri()}>
            <Label>AI</Label>
            <Sub data-tauri-drag-region="true">
              <Link data-testid="ai_config" onClick={() => setShow('ai_config')}>
                <IconAi /> Configure
              </Link>
              <Link data-testid="ai_assistant" onClick={() => setShow('ai_assistant')}>
                <IconAiAssistant /> Assistant
              </Link>
            </Sub>
          </Show>
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
            <Link onClick={() => setShow('help')}>Help</Link>
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
