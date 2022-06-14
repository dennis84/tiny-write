import {For, Show, createEffect, createSignal, onCleanup, splitProps} from 'solid-js'
import {unwrap} from 'solid-js/store'
import {undo, redo} from 'prosemirror-history'
import {differenceInHours, format} from 'date-fns'
import {css} from '@emotion/css'
import {version} from '../../package.json'
import {Config, File, useState} from '../state'
import {foreground, primaryBackground} from '../config'
import {isTauri, isMac, alt, mod, WEB_URL, VERSION_URL} from '../env'
import * as remote from '../remote'
import {isEmpty} from '../prosemirror/state'
import {Styled} from './Layout'
import {PrettierMenu} from './PrettierMenu'
import {AppearanceMenu} from './AppearanceMenu'

const Container = (props: {children: any}) => (
  <div class={css`
    position: relative;
    flex-shrink: 0;
    flex-grow: 1;
    height: 100%;
    font-family: 'JetBrains Mono ExtraLight';
  `}>{props.children}</div>
)

const Burger = (props: Styled) => {
  const [local, others] = splitProps(props, ['config', 'children', 'active'])
  return (
    <button
      {...others}
      class={css`
        position: absolute;
        left: -40px;
        z-index: 9999999;
        width: 20px;
        height: 20px;
        padding: 2px 0;
        margin: 10px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        cursor: pointer;
        background: none;
        border: 0;
        outline: none;
        > span {
          background: ${foreground(local.config)};
          height: 2px;
          width: 100%;
          border-radius: 4px;
          transition: 0.4s;
        }
        ${local.active && `
          > span:nth-of-type(1) {
            transform: rotate(-45deg) translate(-5px, 5px);
          }
          > span:nth-of-type(2) {
            opacity: 0;
          }
          > span:nth-of-type(3) {
            transform: rotate(45deg) translate(-5px, -5px);
          }
        `}
      `}
    >{local.children}</button>
  )
}

export const Off = (props: Styled) => (
  <div class={css`
    background: ${foreground(props.config)}19;
    padding: 20px;
    height: 100%;
    display: ${props.hidden ? 'none' : 'block'};
    width: 460px;
    overflow-y: auto;
    scrollbar-width: none;
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

export const Sub = (props: {children: any}) => (
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
  font-size: 18px;
  line-height: 24px;
  font-family: 'JetBrains Mono ExtraLight';
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
          > i {
            color: ${foreground(local.config)};
            background: ${foreground(local.config)}19;
            border: 1px solid ${foreground(local.config)}99;
            box-shadow: 0 2px 0 0 ${foreground(local.config)}99;
            border-radius: 2px;
            font-size: 13px;
            line-height: 1.4;
            padding: 1px 4px;
            margin: 0 1px;
          }
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

export default () => {
  const [store, ctrl] = useState()
  const [show, setShow] = createSignal()
  const [lastAction, setLastAction] = createSignal<string | undefined>()
  const [isTextEmpty, setIsTextEmpty] = createSignal(false)
  const [collabUsers, setCollabUsers] = createSignal(0)
  const [textStats, setTextStats] = createSignal({
    paragraphs: 0,
    words: 0,
    loc: 0,
  })

  const modKey = isMac ? '⌘' : mod

  createEffect(() => {
    const provider = store.collab?.y?.provider
    if (!provider) return
    const fn = () => setCollabUsers(provider.awareness.meta.size)
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

    store.editorView.state.doc.forEach((node: any) => {
      const text = node.textContent

      if (node.type.name === 'code_block') {
        loc += text.split('\n').length
        return
      }

      const curWords = text.split(/\s+/).filter((x: any) => x != '').length
      if (node.type.name === 'paragraph' && curWords > 0) {
        paragraphs ++
      }

      words += curWords
    })

    setTextStats({paragraphs, words, loc})
    return store.lastModified
  }, store.lastModified)

  const clearText = () => (store.path || store.collab?.room) ? 'Close' :
    (store.files.length > 0 && isTextEmpty()) ? 'Discard ⚠️' :
    'Clear'

  const clearEnabled = () =>
    store.path || store.collab?.room || store.files.length > 0 || !isTextEmpty()

  const onBurgerClick = () => {
    store.editorView.focus()
    setShow(show() ? undefined : 'main')
  }

  const onUndo = () => {
    undo(store.editorView.state, store.editorView.dispatch)
  }

  const onRedo = () => {
    redo(store.editorView.state, store.editorView.dispatch)
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

  const onToggleFullscreen = () => {
    ctrl.setFullscreen(!store.fullscreen)
  }

  const onVersion = () => {
    window.open(VERSION_URL, '_blank')
  }

  const onNew = () => {
    ctrl.newFile()
    store.editorView?.focus()
  }

  const onSaveAs = async () => {
    const path = await remote.save(store.editorView.state)
    if (path) ctrl.updatePath(path)
  }

  const onDiscard = () => {
    ctrl.discard()
  }

  const onCollabStart = () => {
    ctrl.startCollab()
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

  const onOpenFile = (file: File) => {
    ctrl.openFile(unwrap(file))
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

  const FileLink = (p: {file: File}) => {
    const length = 100
    let content = ''
    const getContent = (node: any) => {
      if (node.text) {
        content += node.text + ' '
      }

      if (content.length > length) {
        content = content.substring(0, length) + '...'
        return content
      }

      if (node.content) {
        for (const child of node.content) {
          if (content.length >= length) {
            break
          }

          content = getContent(child)
        }
      }

      return content
    }

    const text = () =>
      p.file.collab?.room ? p.file.collab.room :
      p.file.path ? p.file.path.substring(p.file.path.length - length) :
      getContent(p.file.text?.doc)

    return (
      <Link
        config={store.config}
        style={{'margin-bottom': '10px'}}
        onClick={() => onOpenFile(p.file)}
        data-testid="open">
        {text()}&nbsp;
        <Show when={p.file.path}>📎</Show>
      </Link>
    )
  }

  const Keys = ({keys}: {keys: string[]}) => (
    <span>{keys.map((k) => <i>{k}</i>)}</span>
  )

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

  return (
    <Container>
      <Burger
        config={store.config}
        active={show() !== undefined}
        onClick={onBurgerClick}
        data-testid="burger">
        <span />
        <span />
        <span />
      </Burger>
      <Show when={show() === 'prettier'}>
        <PrettierMenu onBack={() => setShow('main')} />
      </Show>
      <Show when={show() === 'theme'}>
        <AppearanceMenu onBack={() => setShow('main')} />
      </Show>
      <Show when={show() === 'main'}>
        <Off
          config={store.config}
          onClick={() => store.editorView.focus()}
          data-tauri-drag-region="true">
          <div>
            <Label config={store.config}>
              File {store.path && <i>({store.path.substring(store.path.length - 24)})</i>}
            </Label>
            <Sub>
              <Show when={isTauri && !store.path}>
                <Link config={store.config} onClick={onSaveAs}>
                  Save to file <Keys keys={[modKey, 's']} />
                </Link>
              </Show>
              <Link config={store.config} onClick={onNew} data-testid="new">
                New <Keys keys={[modKey, 'n']} />
              </Link>
              <Link
                config={store.config}
                onClick={onDiscard}
                disabled={!clearEnabled()}
                data-testid="discard">
                {clearText()} <Keys keys={[modKey, 'w']} />
              </Link>
            </Sub>
            <Show when={store.files.length > 0}>
              <Label config={store.config}>Files</Label>
              <Sub>
                <For each={store.files}>
                  {(file: File) => <FileLink file={file} />}
                </For>
              </Sub>
            </Show>
            <Label config={store.config}>Edit</Label>
            <Sub>
              <Link config={store.config} onClick={onUndo}>Undo <Keys keys={[modKey, 'z']} /></Link>
              <Link config={store.config} onClick={onRedo}>
                Redo <Keys keys={[modKey, ...(isMac ? ['Shift', 'z'] : ['y'])]} />
              </Link>
              <Link config={store.config} onClick={() => cmd('cut')}>Cut <Keys keys={[modKey, 'x']} /></Link>
              <Link config={store.config} onClick={() => cmd('paste')} disabled={!isTauri}>
                Paste <Keys keys={[modKey, 'p']} />
              </Link>
              <Link config={store.config} onClick={() => cmd('copy')}>
                Copy {lastAction() === 'copy' && '📋'} <Keys keys={[modKey, 'c']} />
              </Link>
              <Link config={store.config} onClick={onCopyAllAsMd}>
                Copy all as markdown {lastAction() === 'copy-md' && '📋'}
              </Link>
            </Sub>
            <Label config={store.config}>View</Label>
            <Sub>
              <Link config={store.config} onClick={() => setShow('theme')}>Appearance 🎨</Link>
              <Link config={store.config} onClick={() => setShow('prettier')}>Prettier 💅</Link>
              <Show when={isTauri}>
                <Link config={store.config} onClick={onToggleFullscreen}>
                  Fullscreen {store.fullscreen && '✅'} <Keys keys={[alt, 'Enter']} />
                </Link>
              </Show>
              <Link config={store.config} onClick={onToggleMarkdown} data-testid="markdown">
                Markdown mode {store.markdown && '✅'}
              </Link>
              <Link config={store.config} onClick={onToggleTypewriterMode}>
                Typewriter mode {store.config.typewriterMode && '✅'}
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
                  title={store.collab?.error ? 'Connection error' : ''}
                  data-testid="collab">
                  Share
                </Link>
              </Show>
              <Show when={collabUsers() > 0}>
                <Link config={store.config} onClick={onCopyCollabLink}>
                  Copy Link {lastAction() === 'copy-collab-link' && '📋'}
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
              <Text config={store.config}>{textStats().words} words</Text>
              <Text config={store.config}>{textStats().paragraphs} paragraphs</Text>
              <Text config={store.config}>{textStats().loc} lines of code</Text>
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
              <Show when={isTauri}>
                <Link
                  config={store.config}
                  onClick={() => remote.quit()}>
                  Quit <Keys keys={[modKey, 'q']} />
                </Link>
              </Show>
            </Sub>
          </div>
        </Off>
      </Show>
    </Container>
  )
}
