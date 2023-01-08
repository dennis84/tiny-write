import {Show, JSX, createEffect, createSignal, onCleanup, splitProps} from 'solid-js'
import {Node} from 'prosemirror-model'
import {differenceInHours, format} from 'date-fns'
import {css} from '@emotion/css'
import * as Y from 'yjs'
import {undo, redo} from 'y-prosemirror'
import {Config, useState} from '@/state'
import {foreground, primaryBackground} from '@/config'
import {isTauri, isMac, alt, mod, version, WEB_URL, VERSION_URL} from '@/env'
import * as remote from '@/remote'
import {isEmpty} from '@/prosemirror'
import {Styled} from './Layout'
import {FilesMenu} from './FilesMenu'
import {CodeBlockMenu} from './CodeBlockMenu'
import {AppearanceMenu} from './AppearanceMenu'
import {ChangeSetMenu} from './ChangeSetMenu'
import {HelpMenu} from './HelpMenu'

const fullWidth = 500

const Container = (props: {children: JSX.Element}) => (
  <div class={css`
    position: relative;
    flex-shrink: 0;
    flex-grow: 1;
    height: 100%;
    font-family: 'iA Writer Mono';
    @media print {
      display: none;
    }
  `}>{props.children}</div>
)

const Burger = (props: Styled) => {
  const [local, others] = splitProps(props, ['config', 'children', 'active'])
  return (
    <button
      {...others}
      class={css`
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
        @media (max-width: ${fullWidth}px) {
          right: 0px;
          left: auto;
        }
        > span {
          background: ${foreground(local.config)};
          height: 3px;
          width: 15px;
          border-radius: 4px;
          transition: 0.4s;
        }
        ${local.active && `
          > span:nth-of-type(1) {
            transform: rotate(-45deg) translate(-2.5px, 2.5px);
          }
          > span:nth-of-type(2) {
            transform: rotate(45deg) translate(-2.5px, -2.5px);
          }
        `}
      `}
    >{local.children}</button>
  )
}

export const Drawer = (props: Styled) => (
  <div data-tauri-drag-region="true" class={css`
    background: ${foreground(props.config)}19;
    padding: 20px;
    height: 100%;
    display: ${props.hidden ? 'none' : 'block'};
    width: 460px;
    overflow-y: auto;
    scrollbar-width: none;
    @media (max-width: ${fullWidth}px) {
      width: 100vw;
      ${isTauri && 'padding-top: 40px'}
    }
    ::-webkit-scrollbar {
      display: none;
    }
  `}>{props.children}</div>
)

export const Label = (props: Styled) => (
  <h3 class={css`
    margin: 0;
    font-size: 14px;
    text-transform: uppercase;
    color: ${foreground(props.config)}7f;
    > i {
      text-transform: none;
    }
  `}>{props.children}</h3>
)

export const Sub = (props: {children: JSX.Element}) => (
  <nav class={css`
    margin: 10px 0;
    margin-bottom: 30px;
  `}>{props.children}</nav>
)

const itemCss = (config: Config) => css`
  width: 100%;
  padding: 2px 0;
  margin: 0;
  outline: none;
  display: flex;
  align-items: center;
  color: ${foreground(config)};
  font-size: 16px;
  line-height: 22px;
  font-family: 'iA Writer Mono';
  text-align: left;
`

export const Text = (props: Styled) => (
  <p
    class={itemCss(props.config)}
    data-testid={props['data-testid']}>
    {props.children}
  </p>
)

export const Link = (props: Styled) => {
  const [local, others] = splitProps(props, ['config', 'children'])
  return (
    <button
      {...others}
      class={css`
        ${itemCss(local.config)}
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
          color: ${primaryBackground(local.config)};
          > span i {
            position: relative;
            box-shadow: 0 3px 0 0 ${foreground(local.config)}99;
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
          color: ${foreground(local.config)}99;
          cursor: not-allowed;
        }
      `}
    >{local.children}</button>
  )
}

export const Keys = (props: Styled) => {
  const [local] = splitProps(props, ['config'])
  return (
    <span
      class={css`
        margin-top: -4px;
        > i {
          color: ${foreground(local.config)};
          background: ${foreground(local.config)}19;
          border: 1px solid ${foreground(local.config)}99;
          box-shadow: 0 2px 0 0 ${foreground(local.config)}99;
          border-radius: 2px;
          font-style: normal;
          font-size: 13px;
          line-height: 1.4;
          padding: 1px 4px;
          margin: 0 1px;
        }
      `}
    >{props.keys.map((k) => <i>{k}</i>)}</span>
  )
}

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
    setIsTextEmpty(isEmpty(store.editorView?.state))

    let paragraphs = 0
    let words = 0
    let loc = 0

    if (!store.editorView) return

    store.editorView.state.doc.forEach((node: Node) => {
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
    return [store.lastModified, store.collab.ready]
  }, [store.lastModified, store.collab.ready])

  const clearText = () => (store.path || store.collab?.started) ? 'Close ⚠️' :
    (store.files.length > 0 && isTextEmpty()) ? 'Discard ⚠️' :
    'Clear 🧽'

  const clearEnabled = () =>
    store.path || store.collab?.room || store.files.length > 0 || !isTextEmpty()

  const onBurgerClick = () => {
    store.editorView?.focus()
    setShow(show() ? undefined : 'main')
  }

  const onUndo = () => {
    undo(store.editorView.state)
    store.editorView?.focus()
  }

  const onRedo = () => {
    redo(store.editorView.state)
    store.editorView?.focus()
  }

  const cmd = (cmd: string) => {
    (document as any).execCommand(cmd)
    setLastAction(cmd)
  }

  const onCopyAllAsMd = () => {
    remote.copyAllAsMarkdown(store.editorView.state).then(() => {
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
    store.editorView?.focus()
  }

  const onSaveAs = async () => {
    const path = await remote.save(store.editorView.state)
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
      window.open(`tinywrite://main?room=${store.collab.room}`, '_self')
    } else {
      const text = window.btoa(JSON.stringify(store.editorView.state.toJSON()))
      window.open(`tinywrite://main?text=${text}`, '_self')
    }
  }

  const onCopyCollabLink = () => {
    remote.copy(`${WEB_URL}/${store.collab.room}`).then(() => {
      store.editorView.focus()
      setLastAction('copy-collab-link')
    })
  }

  const onCopyCollabAppLink = () => {
    remote.copy(`tinywrite://${store.collab.room}`).then(() => {
      store.editorView.focus()
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
      <Show when={store.lastModified} fallback={
        <Text
          config={store.config}
          data-testid="last-modified">
          Nothing yet
        </Text>
      }>
        <Text
          config={store.config}
          data-testid="last-modified">
          Last modified: {formatDate(store.lastModified)}
        </Text>
      </Show>
    )
  }

  const StorageStats = () => {
    const [ydocSize, setYdocSize] = createSignal(0)

    createEffect(() => {
      if (!store.collab.ydoc) return
      setYdocSize(Y.encodeStateAsUpdate(store.collab.ydoc).byteLength)
    })

    return (
      <>
        <Text config={store.config}>
          File size: {(ydocSize() / 1024 / 1024).toFixed(2)} MiB
        </Text>
        <Text config={store.config}>
          DB size used: {(store.storageSize / 1024 / 1024).toFixed(2)} MiB
        </Text>
      </>
    )
  }

  createEffect(() => {
    setLastAction(undefined)
  }, store.lastModified)

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
    if (!store.path) return
    const rel = await remote.toRelativePath(store.path)
    setRelativePath(rel)
  }, store.path)

  return (
    <Container>
      <Burger
        config={store.config}
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
          config={store.config}
          onClick={() => store.editorView.focus()}>
          <Label config={store.config}>
            File {store.path && <i>({relativePath()})</i>}
          </Label>
          <Sub>
            <Show when={isTauri && !store.path}>
              <Link config={store.config} onClick={onSaveAs}>
                Save to file 💾 <Keys config={store.config} keys={[modKey, 's']} />
              </Link>
            </Show>
            <Link config={store.config} onClick={onNew} data-testid="new">
              New 🆕 <Keys config={store.config} keys={[modKey, 'n']} />
            </Link>
            <Link
              config={store.config}
              onClick={onDiscard}
              disabled={!clearEnabled()}
              data-testid="discard">
              {clearText()} <Keys config={store.config} keys={[modKey, 'w']} />
            </Link>
            <Show when={store.files.length > 0}>
              <Link
                config={store.config}
                onClick={() => setShow('files')}
                data-testid="files"
              >Files 🗃️</Link>
            </Show>
          </Sub>
          <Label config={store.config}>Edit</Label>
          <Sub>
            <Link config={store.config} onClick={onUndo}>
              Undo <Keys config={store.config} keys={[modKey, 'z']} />
            </Link>
            <Link config={store.config} onClick={onRedo}>
              Redo <Keys config={store.config} keys={[modKey, ...(isMac ? ['Shift', 'z'] : ['y'])]} />
            </Link>
            <Link config={store.config} onClick={() => cmd('cut')}>
              Cut <Keys config={store.config} keys={[modKey, 'x']} />
            </Link>
            <Link config={store.config} onClick={() => cmd('paste')} disabled={!isTauri}>
              Paste <Keys config={store.config} keys={[modKey, 'p']} />
            </Link>
            <Link config={store.config} onClick={() => cmd('copy')}>
              Copy {lastAction() === 'copy' && '📋'} <Keys config={store.config} keys={[modKey, 'c']} />
            </Link>
            <Link config={store.config} onClick={onCopyAllAsMd}>
              Copy all as markdown {lastAction() === 'copy-md' && '📋'}
            </Link>
          </Sub>
          <Label config={store.config}>View</Label>
          <Sub>
            <Link config={store.config} onClick={() => setShow('theme')}>Appearance 🎨</Link>
            <Link config={store.config} onClick={() => setShow('code_block')}>Code Blocks 💅</Link>
            <Link config={store.config} onClick={() => setShow('change_set')}>Change Set 📆</Link>
            <Show when={isTauri}>
              <Link config={store.config} onClick={onToggleFullscreen}>
                Fullscreen {store.fullscreen && '✅'} <Keys config={store.config} keys={[alt, 'Enter']} />
              </Link>
            </Show>
            <Link config={store.config} onClick={onToggleMarkdown} data-testid="markdown">
              Markdown mode {store.markdown && '✅'}
            </Link>
            <Link config={store.config} onClick={onToggleTypewriterMode}>
              Typewriter mode {store.config.typewriterMode && '✅'}
            </Link>
            <Link config={store.config} onClick={onToggleSpellcheck}>
              Spellcheck {store.config.spellcheck && '✅'}
            </Link>
            <Show when={isTauri}>
              <Link config={store.config} onClick={onToggleAlwaysOnTop}>
                Always on Top {store.config.alwaysOnTop && '✅'}
              </Link>
            </Show>
          </Sub>
          <Label config={store.config}>Collab</Label>
          <Sub>
            <Show when={!store.collab?.started}>
              <Link
                config={store.config}
                onClick={onCollabStart}
                data-testid="collab">
                Share 🌐
              </Link>
            </Show>
            <Show when={store.collab?.started}>
              <Link
                config={store.config}
                onClick={onCollabStop}
                data-testid="collab">
                Disconnect
              </Link>
              <Link config={store.config} onClick={onCopyCollabLink}>
                Copy Link 🔗 {lastAction() === 'copy-collab-link' && '📋'}
              </Link>
              <Show when={false}>
                <Link config={store.config} onClick={onCopyCollabAppLink}>
                  Copy App Link {lastAction() === 'copy-collab-app-link' && '📋'}
                </Link>
              </Show>
              <Text config={store.config}>
                {collabUsers()} {collabUsers() === 1 ? 'user' : 'users'} connected
              </Text>
            </Show>
          </Sub>
          <Label config={store.config}>Stats</Label>
          <Sub>
            <LastModified />
            <StorageStats />
            <Text config={store.config}>Words: {textStats().words}</Text>
            <Text config={store.config}>Paragraphs: {textStats().paragraphs}</Text>
            <Text config={store.config}>Lines of code: {textStats().loc}</Text>
          </Sub>
          <Label config={store.config}>Application</Label>
          <Sub>
            {/* doesn't work with tauri */}
            <Show when={(!isTauri && false)}>
              <Link config={store.config} onClick={onOpenInApp}>Open in App ⚡</Link>
            </Show>
            <Link config={store.config} onClick={onVersion}>
              About Version {version}
            </Link>
            <Link config={store.config} onClick={() => setShow('help')}>Help</Link>
            <Show when={isTauri}>
              <Link
                config={store.config}
                onClick={() => remote.quit()}>
                Quit <Keys config={store.config} keys={[modKey, 'q']} />
              </Link>
            </Show>
          </Sub>
        </Drawer>
      </Show>
    </Container>
  )
}
