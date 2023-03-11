import {Show, createEffect, createSignal, onCleanup} from 'solid-js'
import {css, styled} from 'solid-styled-components'
import {Node} from 'prosemirror-model'
import {differenceInHours, format} from 'date-fns'
import * as Y from 'yjs'
import {undo, redo} from 'y-prosemirror'
import {useState} from '@/state'
import {isTauri, isMac, alt, mod, version, WEB_URL, VERSION_URL} from '@/env'
import * as remote from '@/remote'
import {isEmpty} from '@/prosemirror'
import {FilesMenu} from './FilesMenu'
import {CodeBlockMenu} from './CodeBlockMenu'
import {AppearanceMenu} from './AppearanceMenu'
import {ChangeSetMenu} from './ChangeSetMenu'
import {HelpMenu} from './HelpMenu'

const fullWidth = 500

const Container = styled('div')`
  position: relative;
  flex-shrink: 0;
  flex-grow: 1;
  height: 100%;
  font-family: var(--menu-font-family);
  @media print {
    display: none;
  }
`

const Burger = styled('button')`
  position: absolute;
  left: -35px;
  z-index: 9999999;
  width: 15px;
  height: 10px;
  padding: 10px;
  box-sizing: content-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  background: none;
  border: 0;
  outline: none;
  @media (max-width: ${fullWidth.toString()}px) {
    right: 0px;
    left: auto;
  }
  > span {
    background: var(--foreground);
    height: 3px;
    width: 15px;
    border-radius: 4px;
    transition: 0.4s;
  }
  ${(props: any) => props.active && `
    > span:nth-of-type(1) {
      transform: rotate(-45deg) translate(-2.5px, 2.5px);
    }
    > span:nth-of-type(2) {
      transform: rotate(45deg) translate(-2.5px, -2.5px);
    }
  `}
`

export const Drawer = styled('div')`
  background: var(--foreground-5);
  padding: 20px;
  height: 100%;
  display: ${(props: any) => props.hidden ? 'none' : 'block'};
  width: 360px;
  overflow-y: auto;
  scrollbar-width: none;
  @media (max-width: ${fullWidth.toString()}px) {
    width: 100vw;
    ${isTauri ? 'padding-top: 40px' : ''}
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
`

const itemCss = `
  width: 100%;
  padding: 2px 0;
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

export const Text = styled('p')`${itemCss}`

export const Link = styled('button')`
  ${itemCss}
  background: none;
  border: 0;
  cursor: pointer;
  i {
    font-style: normal;
  }
  > span {
    justify-self: flex-end;
    margin-left: auto;
  }
  &:hover {
    color: var(--primary-background);
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
    class={css`
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
    `}
  >{props.keys.map((k: string) => <i>{k}</i>)}</span>
)

export default () => {
  const [store, ctrl] = useState()
  const [show, setShow] = createSignal()
  const [lastAction, setLastAction] = createSignal<string | undefined>()
  const [isTextEmpty, setIsTextEmpty] = createSignal(false)
  const [collabUsers, setCollabUsers] = createSignal(0)
  const [relativePath, setRelativePath] = createSignal('')
  const [textStats, setTextStats] = createSignal({
    paragraphs: 0,
    words: 0,
    loc: 0,
  })

  const modKey = isMac ? '⌘' : mod

  createEffect(() => {
    const provider = store.collab?.provider
    if (!provider) return
    const fn = () => setCollabUsers(provider.awareness.states.size)
    provider.awareness.on('update', fn)
    onCleanup(() => {
      setCollabUsers(0)
      provider?.awareness.off('update', fn)
    })
  })

  createEffect(() => {
    setIsTextEmpty(isEmpty(store.editor?.editorView?.state) ?? true)

    let paragraphs = 0
    let words = 0
    let loc = 0

    if (!store.editor?.editorView) return

    store.editor?.editorView.state.doc.forEach((node: Node) => {
      const text = node.textContent

      if (node.type.name === 'code_block') {
        loc += text.split('\n').length
        return
      }

      const curWords = text.split(/\s+/).filter((x) => x != '').length
      if (node.type.name === 'paragraph' && curWords > 0) {
        paragraphs ++
      }

      words += curWords
    })

    setTextStats({paragraphs, words, loc})
    return [store.editor?.lastModified, store.collab?.ready]
  }, [store.editor?.lastModified, store.collab?.ready])

  const clearText = () => (store.editor?.path || store.collab?.started) ? 'Close ⚠️' :
    (store.files.length > 0 && isTextEmpty()) ? 'Discard ⚠️' :
    'Clear 🧽'

  const clearEnabled = () =>
    store.editor?.path || store.editor?.id || store.files.length > 0 || !isTextEmpty()

  const onBurgerClick = () => {
    store.editor?.editorView?.focus()
    setShow(show() ? undefined : 'main')
  }

  const onUndo = () => {
    undo(store.editor?.editorView?.state)
    store.editor?.editorView?.focus()
  }

  const onRedo = () => {
    redo(store.editor?.editorView?.state)
    store.editor?.editorView?.focus()
  }

  const cmd = (cmd: string) => {
    (document as any).execCommand(cmd)
    setLastAction(cmd)
  }

  const onCopyAllAsMd = () => {
    const state = store.editor?.editorView?.state
    if (!state) return
    remote.copyAllAsMarkdown(state).then(() => {
      setLastAction('copy-md')
    })
  }

  const onToggleAlwaysOnTop = () => {
    ctrl.setAlwaysOnTop(!store.config.alwaysOnTop)
  }

  const onToggleTypewriterMode = () => {
    ctrl.updateConfig({typewriterMode: !store.config.typewriterMode})
  }

  const onToggleSpellcheck = () => {
    ctrl.updateConfig({spellcheck: !store.config.spellcheck})
  }

  const onToggleFullscreen = () => {
    ctrl.setFullscreen(!store.fullscreen)
  }

  const onVersion = () => {
    window.open(VERSION_URL, '_blank')
  }

  const onNew = () => {
    ctrl.newFile()
    maybeHide()
    store.editor?.editorView?.focus()
  }

  const onSaveAs = async () => {
    const state = store.editor?.editorView?.state
    if (!state) return
    const path = await remote.save(state)
    if (path) ctrl.updatePath(path)
  }

  const onDiscard = async () => {
    const res = await ctrl.discard()
    if (res) maybeHide()
  }

  const onCollabStart = () => {
    ctrl.startCollab()
  }

  const onCollabStop = () => {
    ctrl.stopCollab()
  }

  const onOpenInApp = () => {
    if (isTauri) return
    if (store.collab?.started) {
      window.open(`tinywrite://main?room=${store.editor?.id}`, '_self')
    } else {
      const state = store.editor?.editorView?.state
      if (!state) return
      const text = window.btoa(JSON.stringify(state.toJSON()))
      window.open(`tinywrite://main?text=${text}`, '_self')
    }
  }

  const onCopyCollabLink = () => {
    remote.copy(`${WEB_URL}/${store.editor?.id}`).then(() => {
      store.editor?.editorView?.focus()
      setLastAction('copy-collab-link')
    })
  }

  const onCopyCollabAppLink = () => {
    remote.copy(`tinywrite://${store.editor?.id}`).then(() => {
      store.editor?.editorView?.focus()
      setLastAction('copy-collab-app-link')
    })
  }

  const onToggleMarkdown = () => ctrl.toggleMarkdown()

  const maybeHide = () => {
    if (window.innerWidth <= fullWidth) setShow(undefined)
  }

  const LastModified = () => {
    const formatDate = (date: Date) => {
      const now = new Date()

      if (differenceInHours(now, date) <= 24) {
        return format(date, 'HH:mm:ss')
      } else if (date.getFullYear() === now.getFullYear()) {
        return format(date, 'dd MMMM HH:mm:ss')
      }

      return format(date, 'dd MMMM yyyy HH:mm:ss')
    }

    return (
      <Show when={store.editor?.lastModified !== undefined} fallback={
        <Text data-testid="last-modified">
          Nothing yet
        </Text>
      }>
        <Text data-testid="last-modified">
          Last modified: {formatDate(store.editor!.lastModified!)}
        </Text>
      </Show>
    )
  }

  const StorageStats = () => {
    const [ydocSize, setYdocSize] = createSignal(0)

    createEffect(() => {
      if (!store.collab?.ydoc) return
      setYdocSize(Y.encodeStateAsUpdate(store.collab.ydoc).byteLength)
    })

    return (
      <>
        <Text>
          File size: {(ydocSize() / 1024 / 1024).toFixed(2)} MiB
        </Text>
        <Text>
          DB size used: {(store.storageSize / 1024 / 1024).toFixed(2)} MiB
        </Text>
      </>
    )
  }

  createEffect(() => {
    setLastAction(undefined)
  }, store.editor?.lastModified)

  createEffect(() => {
    if (!show()) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShow(undefined)
    }

    document.addEventListener('keydown', onKeyDown)
    onCleanup(() => document.removeEventListener('keydown', onKeyDown))
  })

  createEffect(() => {
    if (!lastAction()) return
    const id = setTimeout(() => {
      setLastAction(undefined)
    }, 1000)
    onCleanup(() => clearTimeout(id))
  })

  createEffect(async () => {
    if (!store.editor?.path) return
    const rel = await remote.toRelativePath(store.editor?.path)
    setRelativePath(rel)
  }, store.editor?.path)

  return (
    <Container>
      <Burger
        active={show() !== undefined}
        onClick={onBurgerClick}
        data-testid="burger">
        <span />
        <span />
      </Burger>
      <Show when={show() === 'files'}>
        <FilesMenu onBack={() => setShow('main')} onOpenFile={() => maybeHide()} />
      </Show>
      <Show when={show() === 'code_block'}>
        <CodeBlockMenu onBack={() => setShow('main')} />
      </Show>
      <Show when={show() === 'theme'}>
        <AppearanceMenu onBack={() => setShow('main')} />
      </Show>
      <Show when={show() === 'help'}>
        <HelpMenu onBack={() => setShow('main')} />
      </Show>
      <Show when={show() === 'change_set'}>
        <ChangeSetMenu onBack={() => setShow('main')} />
      </Show>
      <Show when={show() === 'main'}>
        <Drawer
          onClick={() => store.editor?.editorView?.focus()}
          data-tauri-drag-region="true">
          <Label>
            File {store.editor?.path && <i>({relativePath()})</i>}
          </Label>
          <Sub data-tauri-drag-region="true">
            <Show when={isTauri && !store.editor?.path}>
              <Link onClick={onSaveAs}>
                Save to file 💾 <Keys keys={[modKey, 's']} />
              </Link>
            </Show>
            <Link onClick={onNew} data-testid="new">
              New 🆕 <Keys keys={[modKey, 'n']} />
            </Link>
            <Link
              onClick={onDiscard}
              disabled={!clearEnabled()}
              data-testid="discard">
              {clearText()} <Keys keys={[modKey, 'w']} />
            </Link>
            <Show when={store.files.length > 0}>
              <Link
                onClick={() => setShow('files')}
                data-testid="files"
              >Files 🗃️</Link>
            </Show>
          </Sub>
          <Show when={store.editor?.id !== undefined}>
            <Label>Edit</Label>
            <Sub data-tauri-drag-region="true">
              <Link onClick={onUndo}>
                Undo <Keys keys={[modKey, 'z']} />
              </Link>
              <Link onClick={onRedo}>
                Redo <Keys keys={[modKey, ...(isMac ? ['Shift', 'z'] : ['y'])]} />
              </Link>
              <Link onClick={() => cmd('cut')}>
                Cut <Keys keys={[modKey, 'x']} />
              </Link>
              <Link onClick={() => cmd('paste')} disabled={!isTauri}>
                Paste <Keys keys={[modKey, 'p']} />
              </Link>
              <Link onClick={() => cmd('copy')}>
                Copy {lastAction() === 'copy' && '📋'} <Keys keys={[modKey, 'c']} />
              </Link>
              <Link onClick={onCopyAllAsMd}>
                Copy all as markdown {lastAction() === 'copy-md' && '📋'}
              </Link>
            </Sub>
          </Show>
          <Label>View</Label>
          <Sub data-tauri-drag-region="true">
            <Link onClick={() => setShow('theme')}>Appearance 🎨</Link>
            <Link onClick={() => setShow('code_block')}>Code Blocks 💅</Link>
            <Link onClick={() => setShow('change_set')}>Change Set 📆</Link>
            <Show when={isTauri}>
              <Link onClick={onToggleFullscreen}>
                Fullscreen {store.fullscreen && '✅'} <Keys keys={[alt, 'Enter']} />
              </Link>
            </Show>
            <Link onClick={onToggleMarkdown} data-testid="markdown">
              Markdown mode {store.editor?.markdown && '✅'}
            </Link>
            <Link onClick={onToggleTypewriterMode}>
              Typewriter mode {store.config.typewriterMode && '✅'}
            </Link>
            <Link onClick={onToggleSpellcheck}>
              Spellcheck {store.config.spellcheck && '✅'}
            </Link>
            <Show when={isTauri}>
              <Link onClick={onToggleAlwaysOnTop}>
                Always on Top {store.config.alwaysOnTop && '✅'}
              </Link>
            </Show>
          </Sub>
          <Label>Collab</Label>
          <Sub data-tauri-drag-region="true">
            <Show when={!store.collab?.started}>
              <Link
                onClick={onCollabStart}
                data-testid="collab">
                Share 🌐
              </Link>
            </Show>
            <Show when={store.collab?.started}>
              <Link
                onClick={onCollabStop}
                data-testid="collab">
                Disconnect
              </Link>
              <Link onClick={onCopyCollabLink}>
                Copy Link 🔗 {lastAction() === 'copy-collab-link' && '📋'}
              </Link>
              <Show when={false}>
                <Link onClick={onCopyCollabAppLink}>
                  Copy App Link {lastAction() === 'copy-collab-app-link' && '📋'}
                </Link>
              </Show>
              <Text>
                {collabUsers()} {collabUsers() === 1 ? 'user' : 'users'} connected
              </Text>
            </Show>
          </Sub>
          <Label>Stats</Label>
          <Sub data-tauri-drag-region="true">
            <LastModified />
            <StorageStats />
            <Text>Words: {textStats().words}</Text>
            <Text>Paragraphs: {textStats().paragraphs}</Text>
            <Text>Lines of code: {textStats().loc}</Text>
          </Sub>
          <Label>Application</Label>
          <Sub data-tauri-drag-region="true">
            {/* doesn't work with tauri */}
            <Show when={(!isTauri && false)}>
              <Link onClick={onOpenInApp}>Open in App ⚡</Link>
            </Show>
            <Link onClick={onVersion}>
              About Version {version}
            </Link>
            <Link onClick={() => setShow('help')}>Help</Link>
            <Show when={isTauri}>
              <Link
                onClick={() => remote.quit()}>
                Quit <Keys keys={[modKey, 'q']} />
              </Link>
            </Show>
          </Sub>
        </Drawer>
      </Show>
    </Container>
  )
}
