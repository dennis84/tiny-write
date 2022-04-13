import {For, Show, createEffect, createSignal, onCleanup} from 'solid-js'
import {unwrap} from 'solid-js/store'
import {undo, redo} from 'prosemirror-history'
import {differenceInHours, format} from 'date-fns'
import {css} from '@emotion/css'
import tauriConf from '../../src-tauri/tauri.conf.json'
import {Config, File, PrettierConfig, useState} from '../state'
import {foreground, primaryBackground, themes, fonts, codeThemes} from '../config'
import {isTauri, isMac, alt, mod, WEB_URL, VERSION_URL} from '../env'
import * as remote from '../remote'
import {isEmpty} from '../prosemirror/state'
import {Styled} from './Layout'

const Container = ({children}: {children: any}) => (
  <div className={css`
    position: relative;
    flex-shrink: 0;
    flex-grow: 1;
    height: 100%;
    font-family: 'JetBrains Mono';
  `}>{children}</div>
)

const Burger = (props: Styled & {active: boolean}) => (
  <button
    className={css`
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
        background: ${foreground(props.config)};
        height: 2px;
        width: 100%;
        border-radius: 4px;
        transition: 0.4s;
      }
      ${props.active && `
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
    onClick={props.onClick}
    data-testid={props['data-testid']}>
    {props.children}
  </button>
)

const Off = ({config, children}: Styled) => (
  <div className={css`
    background: ${foreground(config)}19;
    padding: 20px;
    height: 100%;
    width: 460px;
    overflow-y: auto;
    scrollbar-width: none;
    ::-webkit-scrollbar {
      display: none;
    }
  `}>{children}</div>
)

const Label = (props: Styled) => (
  <h3 className={css`
    margin: 0;
    font-size: 14px;
    text-transform: uppercase;
    color: ${foreground(props.config)}7f;
    > i {
      text-transform: none;
    }
  `}>{props.children}</h3>
)

const Sub = ({children}: {children: any}) => (
  <nav className={css`
    margin: 10px 0;
    margin-bottom: 30px;
  `}>{children}</nav>
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
  font-family: 'JetBrains Mono';
  text-align: left;
`

const Text = (props: Styled) => (
  <p
    className={itemCss(props.config)}
    data-testid={props['data-testid']}>
    {props.children}
  </p>
)

const Link = (props: Styled & {withMargin?: boolean; disabled?: boolean; title?: string}) => (
  <button
    className={css`
      ${itemCss(props.config)}
      background: none;
      border: 0;
      cursor: pointer;
      margin-bottom: ${props.withMargin ? '10px' : ''};
      i {
        font-style: normal;
      }
      > span {
        justify-self: flex-end;
        margin-left: auto;
        > i {
          color: ${foreground(props.config)};
          background: ${foreground(props.config)}19;
          border: 1px solid ${foreground(props.config)}99;
          box-shadow: 0 2px 0 0 ${foreground(props.config)}99;
          border-radius: 2px;
          font-size: 13px;
          line-height: 1.4;
          padding: 1px 4px;
          margin: 0 1px;
        }
      }
      &:hover {
        color: ${primaryBackground(props.config)};
        > span i {
          position: relative;
          box-shadow: 0 3px 0 0 ${foreground(props.config)}99;
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
        color: ${foreground(props.config)}99;
        cursor: not-allowed;
      }
    `}
    onClick={props.onClick}
    disabled={props.disabled}
    title={props.title}
    data-testid={props['data-testid']}>
    {props.children}
  </button>
)

export default () => {
  const [store, ctrl] = useState()
  const [show, setShow] = createSignal(false)
  const [lastAction, setLastAction] = createSignal<string | undefined>()
  const [isTextEmpty, setIsTextEmpty] = createSignal(false)
  const [collabUsers, setCollabUsers] = createSignal(0)
  const [textStats, setTextStats] = createSignal({
    paragraphs: 0,
    words: 0,
    loc: 0,
  })

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
    setShow(!show())
  }

  const onUndo = () => {
    undo(store.editorView.state, store.editorView.dispatch)
  }

  const onRedo = () => {
    redo(store.editorView.state, store.editorView.dispatch)
  }

  const cmd = (cmd: string) => () => {
    (document as any).execCommand(cmd)
    setLastAction(cmd)
  }

  const onCopyAllAsMd = () => {
    remote.copyAllAsMarkdown(store.editorView.state).then(() => {
      setLastAction('copy-md')
    })
  }

  const onChangeTheme = (theme: string) => () => {
    ctrl.updateConfig({theme})
  }

  const onChangeCodeTheme = (codeTheme: string) => () => {
    ctrl.updateConfig({codeTheme})
  }

  const onChangeFont = (font: string) => () => {
    ctrl.updateConfig({font})
  }

  const onChangeFontSize = (e: any) => {
    ctrl.updateConfig({fontSize: Number(e.target.value)})
  }

  const onChangeContentWidth = (e: any) => {
    ctrl.updateConfig({contentWidth: Number(e.target.value)})
  }

  const updatePrettier = (opt: Partial<PrettierConfig>) => {
    ctrl.updateConfig({
      prettier: {...store.config.prettier, ...opt}
    })
  }

  const onToggleAlwaysOnTop = () => {
    ctrl.updateConfig({alwaysOnTop: !store.config.alwaysOnTop})
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
        withMargin={true}
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
      if (e.key === 'Escape') setShow(false)
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
        active={show()}
        onClick={onBurgerClick}
        data-testid="burger">
        <span />
        <span />
        <span />
      </Burger>
      <Show when={show()}>
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
                  Save to file <Keys keys={[mod, 's']} />
                </Link>
              </Show>
              <Link config={store.config} onClick={onNew} data-testid="new">
                New <Keys keys={[mod, 'n']} />
              </Link>
              <Link
                config={store.config}
                onClick={onDiscard}
                disabled={!clearEnabled()}
                data-testid="discard">
                {clearText()} <Keys keys={[mod, 'w']} />
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
              <Link config={store.config} onClick={onUndo}>Undo <Keys keys={[mod, 'z']} /></Link>
              <Link config={store.config} onClick={onRedo}>
                Redo <Keys keys={[mod, ...(isMac ? ['Shift', 'z'] : ['y'])]} />
              </Link>
              <Link config={store.config} onClick={cmd('cut')}>Cut <Keys keys={[mod, 'x']} /></Link>
              <Link config={store.config} onClick={cmd('paste')} disabled={!isTauri}>
                Paste <Keys keys={[mod, 'p']} />
              </Link>
              <Link config={store.config} onClick={cmd('copy')}>
                Copy {lastAction() === 'copy' && '📋'} <Keys keys={[mod, 'c']} />
              </Link>
              <Link config={store.config} onClick={onCopyAllAsMd}>
                Copy all as markdown {lastAction() === 'copy-md' && '📋'}
              </Link>
            </Sub>
            <Label config={store.config}>Theme</Label>
            <Sub>
              <For each={Object.entries(themes)}>
                {([key, value]) => (
                  <Link config={store.config} onClick={onChangeTheme(key)}>
                    {value.label}{' '}{key === store.config.theme && '✅'}
                  </Link>
                )}
              </For>
            </Sub>
            <Label config={store.config}>Code</Label>
            <Sub>
              <For each={Object.entries(codeThemes)}>
                {([key, value]) => (
                  <Link config={store.config} onClick={onChangeCodeTheme(key)}>
                    {value.label}{' '}{key === store.config.codeTheme && '✅'}
                  </Link>
                )}
              </For>
            </Sub>
            <Label config={store.config}>Font</Label>
            <Sub>
              <For each={Object.entries(fonts)}>
                {([key, value]) => (
                  <Link config={store.config} onClick={onChangeFont(key)}>
                    {value.label}{' '}{key === store.config.font && '✅'}
                  </Link>
                )}
              </For>
            </Sub>
            <Label config={store.config}>View</Label>
            <Sub>
              <Show when={isTauri}>
                <Link config={store.config} onClick={onToggleFullscreen}>
                  Fullscreen {store.fullscreen && '✅'} <Keys keys={[alt, 'Enter']} />
                </Link>
              </Show>
              <Link config={store.config} onClick={onToggleMarkdown} data-testid="markdown">
                Markdown mode {store.markdown && '✅'} <Keys keys={[mod, 'm']} />
              </Link>
              <Link config={store.config} onClick={onToggleTypewriterMode}>
                Typewriter mode {store.config.typewriterMode && '✅'}
              </Link>
              <Show when={isTauri}>
                <Link config={store.config} onClick={onToggleAlwaysOnTop}>
                  Always on Top {store.config.alwaysOnTop && '✅'}
                </Link>
              </Show>
              <Text config={store.config}>
                Font size:
                <input
                  type="range"
                  min="8"
                  max="48"
                  value={store.config.fontSize}
                  onChange={onChangeFontSize} />
                {store.config.fontSize}
              </Text>
              <Text config={store.config}>
                Content width:
                <input
                  type="range"
                  min="400"
                  max="1800"
                  step="100"
                  value={store.config.contentWidth}
                  onChange={onChangeContentWidth} />
                {store.config.contentWidth}
              </Text>
            </Sub>
            <Label config={store.config}>Prettier</Label>
            <Sub>
              <Text config={store.config}>
                Print Width:
                <input
                  type="range"
                  min="20"
                  max="160"
                  step="10"
                  value={store.config.prettier.printWidth}
                  onChange={(e: any) => updatePrettier({printWidth: Number(e.target.value)})} />
                {store.config.prettier.printWidth}
              </Text>
              <Text config={store.config}>
                Tab Width:
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="2"
                  value={store.config.prettier.tabWidth}
                  onChange={(e: any) => updatePrettier({tabWidth: Number(e.target.value)})} />
                {store.config.prettier.tabWidth}
              </Text>
              <Link
                config={store.config}
                onClick={() => updatePrettier({useTabs: !store.config.prettier.useTabs})}>
                Use Tabs {store.config.prettier.useTabs && '✅'}
              </Link>
              <Link
                config={store.config}
                onClick={() => updatePrettier({semi: !store.config.prettier.semi})}>
                Semicolons {store.config.prettier.semi && '✅'}
              </Link>
              <Link
                config={store.config}
                onClick={() => updatePrettier({singleQuote: !store.config.prettier.singleQuote})}>
                Single Quote {store.config.prettier.singleQuote && '✅'}
              </Link>
            </Sub>
            <Label config={store.config}>Stats</Label>
            <Sub>
              <LastModified />
              <Text config={store.config}>{textStats().words} words</Text>
              <Text config={store.config}>{textStats().paragraphs} paragraphs</Text>
              <Text config={store.config}>{textStats().loc} lines of code</Text>
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
            <Label config={store.config}>Application</Label>
            <Sub>
              {/* doesn't work with tauri */}
              <Show when={(!isTauri && false)}>
                <Link config={store.config} onClick={onOpenInApp}>Open in App ⚡</Link>
              </Show>
              <Link config={store.config} onClick={onVersion}>
                About Version {tauriConf.package.version}
              </Link>
              <Show when={isTauri}>
                <Link
                  config={store.config}
                  onClick={() => remote.quit()}>
                  Quit <Keys keys={[mod, 'q']} />
                </Link>
              </Show>
            </Sub>
          </div>
        </Off>
      </Show>
    </Container>
  )
}
