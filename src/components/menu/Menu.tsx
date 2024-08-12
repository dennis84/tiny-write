import {Show, createEffect, createSignal, onCleanup} from 'solid-js'
import {css, styled} from 'solid-styled-components'
import {Mode, useState} from '@/state'
import {isTauri, isMac, mod, shortHash, version, VERSION_URL} from '@/env'
import * as remote from '@/remote'
import {ZIndex} from '@/utils/z-index'
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
import {Icon} from '../Icon'

const fullWidth = 500

const Container = styled('div')`
  position: relative;
  flex-shrink: 0;
  flex-grow: 1;
  height: 100%;
  font-family: var(--menu-font-family);
  background: var(--background);
  @media print {
    display: none;
  }
`

const Burger = styled('button')`
  position: absolute;
  left: -52px;
  top: 2px;
  z-index: var(--z-index-max);
  background: none;
  border-radius: 50px;
  width: 50px;
  height: 50px;
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: var(--cursor-pointer);
  border: 0;
  outline: none;
  > span {
    background: var(--foreground);
    height: 3px;
    width: 15px;
    border-radius: 4px;
    transition: 0.4s;
    margin: 2px 0;
  }
  &:hover {
    background: var(--foreground-10);
  }
  ${(props: any) => props.active ? `
    right: 2px;
    left: auto;
    > span:nth-of-type(1) {
      transform: rotate(-45deg) translate(-2.5px, 2.5px);
    }
    > span:nth-of-type(2) {
      transform: rotate(45deg) translate(-2.5px, -2.5px);
    }
  ` : ''}
`

export const Drawer = styled('div')`
  background: var(--foreground-10);
  padding: 20px;
  height: 100%;
  display: ${(props: any) => (props.hidden ? 'none' : 'block')};
  width: 400px;
  overflow-y: auto;
  scrollbar-width: none;
  @media (max-width: ${fullWidth.toString()}px) {
    width: 100vw;
    ${isTauri() ? 'padding-top: 40px' : ''}
  }
  &::-webkit-scrollbar {
    display: none;
  }
`

export const Label = styled('h3')`
  margin: 10px 0;
  font-size: var(--menu-font-size);
  text-transform: uppercase;
  color: var(--foreground-50);
  > i {
    text-transform: none;
  }
`

export const Sub = styled('nav')`
  margin: 10px 0;
  margin-bottom: 30px;
  position: relative;
`

const itemCss = `
  width: 100%;
  padding: 5px;
  margin: 0;
  outline: none;
  display: flex;
  align-items: center;
  color: var(--foreground);
  font-size: var(--menu-font-size);
  line-height: calc(var(--menu-font-size) * 1.6);
  font-family: var(--menu-font-family);
  text-align: left;
`

export const Text = styled('p')`
  ${itemCss}
`

export const Note = styled('p')`
  ${itemCss}
  font-style: italic;
  color: var(--foreground-80);
  background: var(--foreground-5);
  border-radius: var(--border-radius);
  padding: 10px;
  margin-bottom: 20px;
`

export const Link = styled('button')`
  ${itemCss}
  background: none;
  border: 0;
  cursor: var(--cursor-pointer);
  i {
    font-style: normal;
  }
  > .icon {
    margin-right: 6px;
  }
  > .keys {
    justify-self: flex-end;
    margin-left: auto;
  }
  &:hover {
    color: var(--primary-background);
    background: var(--foreground-10);
    border-radius: var(--border-radius);
    > span i {
      position: relative;
      box-shadow: 0 3px 0 0 var(--foreground-60);
      top: -1px;
    }
  }
  &:active {
    > span i {
      position: relative;
      box-shadow: none;
      top: 1px;
    }
  }
  &[disabled] {
    color: var(--foreground-60);
    cursor: not-allowed;
  }
`

export const Keys = (props: {keys: string[]}) => (
  <span
    class={
      'keys ' +
      css`
        margin-top: -4px;
        > i {
          color: var(--foreground);
          background: var(--foreground-10);
          border: 1px solid var(--foreground-60);
          box-shadow: 0 2px 0 0 var(--foreground-60);
          border-radius: 2px;
          font-style: normal;
          font-size: 13px;
          line-height: 1.4;
          padding: 1px 4px;
          margin: 0 1px;
        }
      `
    }
  >
    {props.keys.map((k: string) => (
      <i>{k}</i>
    ))}
  </span>
)

export const Menu = () => {
  const [store, ctrl] = useState()
  const [show, setShow] = createSignal()

  const modKey = isMac ? '⌘' : mod

  const onBurgerClick = () => {
    ctrl.file.currentFile?.editorView?.focus()
    setShow(show() ? undefined : 'main')
  }

  const onToggleAlwaysOnTop = () => ctrl.config.setAlwaysOnTop(!store.config.alwaysOnTop)

  const onToggleTypewriterMode = () =>
    ctrl.config.updateConfig({typewriterMode: !store.config.typewriterMode})

  const onToggleSpellcheck = () => ctrl.config.updateConfig({spellcheck: !store.config.spellcheck})

  const onToggleFullscreen = () => ctrl.app.setFullscreen(!store.fullscreen)

  const onVersion = () => {
    window.open(VERSION_URL, '_blank')
  }

  const onOpenInApp = () => {
    if (isTauri()) return
    const currentFile = ctrl.file.currentFile
    if (store.collab?.started) {
      window.open(`tinywrite://main?room=${currentFile?.id}`, '_self')
    } else {
      const state = currentFile?.editorView?.state
      if (!state) return
      const text = window.btoa(JSON.stringify(state.toJSON()))
      window.open(`tinywrite://main?text=${text}`, '_self')
    }
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
    const currentFile = ctrl.file.currentFile
    if (!currentFile?.codeEditorView) return true
    const language = currentFile.codeEditorView.contentDOM.dataset.language ?? ''
    return ctrl.prettier.supports(language)
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
          onClick={() => ctrl.file.currentFile?.editorView?.focus()}
          data-tauri-drag-region="true"
        >
          <SubmenuTree onBin={() => setShow('bin')} maybeHide={maybeHide} />
          {/* Submenu File */}
          <Show when={store.mode === Mode.Editor}>
            <SubmenuEditor maybeHide={maybeHide} />
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
                <Icon>code_blocks</Icon> Code Format
              </Link>
            </Show>
            <Show when={store.mode === Mode.Editor}>
              <Link onClick={() => setShow('change_set')}>
                <Icon>history</Icon> Change Set
              </Link>
            </Show>
            <Show when={isTauri()}>
              <Link onClick={onToggleFullscreen}>
                <Icon>fullscreen</Icon> Fullscreen {store.fullscreen && '✅'} <Keys keys={[modKey, 'Enter']} />
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
          </Sub>
        </Drawer>
      </Show>
    </Container>
  )
}
