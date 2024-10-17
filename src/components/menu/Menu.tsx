import {Show, createEffect, createSignal, onCleanup} from 'solid-js'
import {Mode, useState} from '@/state'
import {isTauri, isMac, mod, shortHash, version, VERSION_URL, isDev} from '@/env'
import * as remote from '@/remote'
import {useOpen} from '@/open'
import {Bin} from './Bin'
import {CodeFormat} from './CodeFormat'
import {Appearance} from './Appearance'
import {ChangeSet} from './ChangeSet'
import {Help} from './Help'
import {SubmenuEditor} from './SubmenuEditor'
import {SubmenuCanvas} from './SubmenuCanvas'
import {SubmenuEdit} from './SubmenuEdit'
import {SubmenuCollab} from './SubmenuCollab'
import {SubmenuTree} from './SubmenuTree'
import {SubmenuCode} from './SubmenuCode'
import {Icon, IconPrettier} from '../Icon'
import {fullWidth, Burger, Container, Drawer, Keys, Label, Link, Sub} from './Style'

export const Menu = () => {
  const {store, appService, configService, fileService, prettierService} = useState()
  const [show, setShow] = createSignal()
  const {open} = useOpen()

  const modKey = isMac ? '⌘' : mod

  const onBurgerClick = () => {
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
      <Burger active={show() !== undefined} onClick={onBurgerClick} data-testid="burger">
        <span />
        <span />
      </Burger>
      <Show when={show() === 'bin'}>
        <Bin onBack={() => setShow('main')} />
      </Show>
      <Show when={show() === 'code_format'}>
        <CodeFormat onBack={() => setShow('main')} />
      </Show>
      <Show when={show() === 'theme'}>
        <Appearance onBack={() => setShow('main')} />
      </Show>
      <Show when={show() === 'help'}>
        <Help onBack={() => setShow('main')} />
      </Show>
      <Show when={show() === 'change_set'}>
        <ChangeSet onBack={() => setShow('main')} />
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
              <Link onClick={() => remote.quit()}>
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
