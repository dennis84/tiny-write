import React, {ChangeEvent, useEffect, useState} from 'react'
import {EditorView} from 'prosemirror-view'
import {EditorState} from 'prosemirror-state'
import {undo, redo} from 'prosemirror-history'
import {deleteSelection, selectAll} from 'prosemirror-commands'
import {differenceInHours, format} from 'date-fns'
import styled from '@emotion/styled'
import {css} from '@emotion/react'
import tauriConf from '../../src-tauri/tauri.conf.json'
import {Config, File, Collab, PrettierConfig} from '..'
import {
  Discard,
  New,
  Open,
  ToggleFullscreen,
  UpdateCollab,
  UpdateConfig,
  UpdatePath,
  useDispatch,
} from '../reducer'
import {foreground, primary, themes, fonts, codeThemes} from '../config'
import {isTauri, isMac, alt, mod, WEB_URL, VERSION_URL} from '../env'
import * as remote from '../remote'
import {ProseMirrorState, isEmpty, isInitialized} from '../prosemirror/state'

const Container = styled.div`
  position: relative;
  flex-shrink: 0;
  flex-grow: 1;
  height: 100%;
  font-family: 'JetBrains Mono';
`

const Burger = styled.button<any>`
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
    background: ${props => foreground(props.theme)};
    height: 2px;
    width: 100%;
    border-radius: 4px;
    transition: 0.4s;
  }
  ${props => props.active && `
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
`

const Off = styled.div`
  background: ${props => foreground(props.theme)}19;
  padding: 20px;
  height: 100%;
  min-width: 460px;
  overflow-y: auto;
  scrollbar-width: none;
  ::-webkit-scrollbar {
    display: none;
  }
`

const Menu = styled.div``

const Label = styled.h3`
  margin: 0;
  font-size: 14px;
  text-transform: uppercase;
  color: ${props => foreground(props.theme)}7f;
  > i {
    text-transform: none;
  }
`

const Sub = styled.nav`
  margin: 10px 0;
  margin-bottom: 30px;
`

export const Common = css`
  height: 50px;
  padding: 0 20px;
`

export const Item = (props: {theme: Config}) => css`
  width: 100%;
  padding: 2px 0;
  margin: 0;
  outline: none;
  display: flex;
  align-items: center;
  color: ${foreground(props.theme)};
  font-size: 18px;
  line-height: 24px;
  font-family: 'JetBrains Mono';
  white-space: nowrap;
`

const Text = styled.p`
  ${Item}
`

const Link = styled.button`
  ${Item}
  background: none;
  border: 0;
  cursor: pointer;
  > span {
    justify-self: flex-end;
    margin-left: auto;
    > i {
      color: ${props => foreground(props.theme)};
      background: ${props => foreground(props.theme)}19;
      border: 1px solid ${props => foreground(props.theme)}99;
      box-shadow: 0 2px 0 0 ${props => foreground(props.theme)}99;
      border-radius: 2px;
      font-size: 13px;
      line-height: 1.4;
      padding: 1px 4px;
      margin: 0 1px;
    }
  }
  &:hover {
    color: ${props => primary(props.theme)};
    > span i {
      position: relative;
      box-shadow: 0 3px 0 0 ${props => foreground(props.theme)}99;
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
    color: ${props => foreground(props.theme)}99;
    cursor: not-allowed;
  }
`

const Slider = styled.input``

interface Props {
  text: ProseMirrorState;
  lastModified?: Date;
  path?: string;
  files: File[];
  config: Config;
  fullscreen: boolean;
  collab?: Collab;
  markdown: boolean;
  onToggleMarkdown: () => void;
  editorViewRef: React.RefObject<EditorView>;
}

export default (props: Props) => {
  const dispatch = useDispatch()
  const [show, setShow] = useState(false)
  const [lastAction, setLastAction] = useState<string | undefined>()
  const editorView = props.editorViewRef.current

  const collabText =
    props.collab?.started ? 'Stop' :
    props.collab?.error ? 'Restart 🚨' :
    'Start'

  const collabUsers = props.collab?.y?.provider.awareness.meta.size ?? 0

  const onBurgerClick = () => {
    editorView.focus()
    setShow(!show)
  }

  const onUndo = () => {
    undo(editorView.state, editorView.dispatch)
  }

  const onRedo = () => {
    redo(editorView.state, editorView.dispatch)
  }

  const cmd = (cmd: string) => () => {
    document.execCommand(cmd)
    setLastAction(cmd)
  }

  const onCopyAllAsMd = () => {
    remote.copyAllAsMarkdown(editorView.state).then(() => {
      setLastAction('copy-md')
    })
  }

  const onChangeTheme = (theme: string) => () => {
    dispatch(UpdateConfig({...props.config, theme}))
  }

  const onChangeCodeTheme = (codeTheme: string) => () => {
    dispatch(UpdateConfig({...props.config, codeTheme}))
  }

  const onChangeFont = (font: string) => () => {
    dispatch(UpdateConfig({...props.config, font}))
  }

  const onChangeFontSize = (e: ChangeEvent<HTMLInputElement>) => {
    dispatch(UpdateConfig({...props.config, fontSize: Number(e.target.value)}))
  }

  const onChangeContentWidth = (e: ChangeEvent<HTMLInputElement>) => {
    dispatch(UpdateConfig({...props.config, contentWidth: Number(e.target.value)}))
  }

  const updatePrettier = (opt: Partial<PrettierConfig>) => {
    dispatch(UpdateConfig({
      ...props.config,
      prettier: {...props.config.prettier, ...opt}
    }))
  }

  const onToggleAlwaysOnTop = () => {
    dispatch(UpdateConfig({...props.config, alwaysOnTop: !props.config.alwaysOnTop}))
  }

  const onToggleTypewriterMode = () => {
    dispatch(UpdateConfig({...props.config, typewriterMode: !props.config.typewriterMode}))
  }

  const onToggleFullscreen = () => {
    dispatch(ToggleFullscreen)
  }

  const onVersion = () => {
    window.open(VERSION_URL, '_blank')
  }

  const onNew = () => {
    dispatch(New)
  }

  const onSaveAs = async () => {
    const path = await remote.save(editorView.state)
    if (path) {
      dispatch(UpdatePath(path))
    }
  }

  const onDiscard = () => {
    if (props.path) {
      dispatch(Discard)
    } else if (props.files.length > 0 && isEmpty(props.text?.editorState)) {
      dispatch(Discard)
    } else {
      selectAll(editorView.state, editorView.dispatch)
      deleteSelection(editorView.state, editorView.dispatch)
    }
  }

  const onCollab = () => {
    if (props.collab?.started) {
      dispatch(UpdateCollab({...props.collab, started: false}))
    } else {
      dispatch(UpdateCollab({started: true}))
    }
  }

  const onOpenInApp = () => {
    if (isTauri) return
    if (props.collab?.started) {
      window.open(`tinywrite://main?room=${props.collab.room}`, '_self')
    } else {
      const text = window.btoa(JSON.stringify(editorView.state.toJSON()))
      window.open(`tinywrite://main?text=${text}`, '_self')
    }
  }

  const onCopyCollabLink = () => {
    remote.copy(`${WEB_URL}/${props.collab.room}`).then(() => {
      editorView.focus()
      setLastAction('copy-collab-link')
    })
  }

  const onCopyCollabAppLink = () => {
    remote.copy(`tinywrite://${props.collab.room}`).then(() => {
      editorView.focus()
      setLastAction('copy-collab-app-link')
    })
  }

  const TextStats = () => {
    let paragraphs = 0
    let words = 0
    let loc = 0

    if (isInitialized(props.text?.editorState)) {
      (props.text.editorState as EditorState).doc.forEach((node) => {
        const text = node.textContent

        if (node.type.name === 'code_block') {
          loc += text.split('\n').length
          return
        }

        const curWords = text.split(/\s+/).filter(x => x != '').length
        if (node.type.name === 'paragraph' && curWords > 0) {
          paragraphs ++
        }

        words += curWords
      })
    }

    return (
      <>
        <Text>{words} words</Text>
        <Text>{paragraphs} paragraphs</Text>
        <Text>{loc} lines of code</Text>
      </>
    )
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

    return props.lastModified ? (
      <Text data-testid="last-modified">Last modified {formatDate(props.lastModified)}</Text>
    ) : (
      <Text data-testid="last-modified">Nothing yet</Text>
    )
  }

  const FileLink = (props: {file: File}) => {
    const length = 24
    const getText = (node: any) => {
      let text = ''

      if (node.text) {
        text += node.text + ' '
      }

      if (node.content) {
        for (const child of node.content) {
          if (text.length >= length) {
            break
          }

          text += getText(child)
        }
      }

      return text
    }

    const text = props.file.path ?
      props.file.path.substring(props.file.path.length - length) :
      getText(props.file.text?.doc).substring(0, length)

    return (
      <Link
        onClick={() => dispatch(Open(props.file))}
        data-testid="open">
        {text} {props.file.path && '📎'}
      </Link>
    )
  }

  const Keys = ({keys}: {keys: string[]}) => (
    <span>{keys.map((k, i) => <i key={i}>{k}</i>)}</span>
  )

  useEffect(() => {
    setLastAction(undefined)
  }, [props.lastModified])

  useEffect(() => {
    if (!show) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShow(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [show])

  useEffect(() => {
    if (!lastAction) return
    const id = setTimeout(() => {
      setLastAction(undefined)
    }, 1000)
    return () => {
      clearTimeout(id)
    }
  }, [lastAction])

  return (
    <Container>
      <Burger onClick={onBurgerClick} active={show} data-testid="burger">
        <span />
        <span />
        <span />
      </Burger>
      {show && (
        <Off onClick={() => editorView.focus()} data-tauri-drag-region="true">
          <Menu>
            <Label>File {props.path && <i>({props.path.substring(props.path.length - 24)})</i>}</Label>
            <Sub>
              {isTauri && !props.path && (
                <Link onClick={onSaveAs}>Save to file <Keys keys={[mod, 's']} /></Link>
              )}
              <Link onClick={onNew} data-testid="new">
                New <Keys keys={[mod, 'n']} />
              </Link>
              <Link
                onClick={onDiscard}
                disabled={!props.path && props.files.length === 0 && isEmpty(props.text?.editorState)}
                data-testid="discard">
                {
                  props.path ? 'Close' :
                  (props.files.length > 0 && isEmpty(props.text?.editorState)) ? 'Discard ⚠️' : 'Clear'
                } <Keys keys={[mod, 'w']} />
              </Link>
            </Sub>
            {props.files.length > 0 && (
              <>
                <Label>Files</Label>
                <Sub>
                  {props.files.map((file) => (
                    <FileLink key={file.lastModified} file={file} />
                  ))}
                </Sub>
              </>
            )}
            <Label>Edit</Label>
            <Sub>
              <Link onClick={onUndo}>Undo <Keys keys={[mod, 'z']} /></Link>
              <Link onClick={onRedo}>
                Redo <Keys keys={[mod, ...(isMac ? ['Shift', 'z'] : ['y'])]} />
              </Link>
              <Link onClick={cmd('cut')}>Cut <Keys keys={[mod, 'x']} /></Link>
              <Link onClick={cmd('paste')} disabled={!isTauri}>
                Paste <Keys keys={[mod, 'p']} />
              </Link>
              <Link onClick={cmd('copy')}>
                Copy {lastAction === 'copy' && '📋'} <Keys keys={[mod, 'c']} />
              </Link>
              <Link onClick={onCopyAllAsMd}>
                Copy all as markdown {lastAction === 'copy-md' && '📋'}
              </Link>
            </Sub>
            <Label>Theme</Label>
            <Sub>
              {Object.entries(themes).map(([key, value]) => (
                <Link key={key} onClick={onChangeTheme(key)}>
                  {value.label}{' '}{key === props.config.theme && '✅'}
                </Link>
              ))}
            </Sub>
            <Label>Code</Label>
            <Sub>
              {Object.entries(codeThemes).map(([key, value]) => (
                <Link key={key} onClick={onChangeCodeTheme(key)}>
                  {value.label}{' '}{key === props.config.codeTheme && '✅'}
                </Link>
              ))}
            </Sub>
            <Label>Font</Label>
            <Sub>
              {Object.entries(fonts).map(([key, value]) => (
                <Link key={key} onClick={onChangeFont(key)}>
                  {value.label}{' '}{key === props.config.font && '✅'}
                </Link>
              ))}
            </Sub>
            <Label>View</Label>
            <Sub>
              {isTauri && (
                <Link onClick={onToggleFullscreen}>
                  Fullscreen {props.fullscreen && '✅'} <Keys keys={[alt, 'Enter']} />
                </Link>
              )}
              <Link onClick={props.onToggleMarkdown} data-testid="markdown">
                Markdown mode {props.markdown && '✅'} <Keys keys={[mod, 'm']} />
              </Link>
              <Link onClick={onToggleTypewriterMode}>
                Typewriter mode {props.config.typewriterMode && '✅'}
              </Link>
              {isTauri && (
                <Link onClick={onToggleAlwaysOnTop}>
                  Always on Top {props.config.alwaysOnTop && '✅'}
                </Link>
              )}
              <Text>
                Font size:
                <Slider
                  type="range"
                  min="8"
                  max="48"
                  value={props.config.fontSize}
                  onChange={onChangeFontSize} />
                {props.config.fontSize}
              </Text>
              <Text>
                Content width:
                <Slider
                  type="range"
                  min="400"
                  max="1800"
                  step="100"
                  value={props.config.contentWidth}
                  onChange={onChangeContentWidth} />
                {props.config.contentWidth}
              </Text>
            </Sub>
            <Label>Collab</Label>
            <Sub>
              <Link
                onClick={onCollab}
                title={props.collab?.error ? 'Connection error' : ''}>
                {collabText}
              </Link>
              {collabUsers > 0 && (
                <>
                  <Link onClick={onCopyCollabLink}>
                    Copy Link {lastAction === 'copy-collab-link' && '📋'}
                  </Link>
                  <Link onClick={onCopyCollabAppLink}>
                    Copy App Link {lastAction === 'copy-collab-app-link' && '📋'}
                  </Link>
                  <Text>
                    {collabUsers} {collabUsers === 1 ? 'user' : 'users'} connected
                  </Text>
                </>
              )}
            </Sub>
            <Label>Stats</Label>
            <Sub>
              <LastModified />
              <TextStats />
            </Sub>
            <Label>Application</Label>
            <Sub>
              {/* doesn't work with tauri */}
              {(!isTauri && false) && (
                <Link onClick={onOpenInApp}>
                  Open in App ⚡
                </Link>
              )}
              <Link onClick={onVersion}>
                About Version {tauriConf.package.version}
              </Link>
              {isTauri && (
                <Link onClick={() => remote.quit()}>Quit <Keys keys={[mod, 'q']} /></Link>
              )}
            </Sub>
            <Label>Prettier</Label>
            <Sub>
              <Text>
                Print Width:
                <Slider
                  type="range"
                  min="20"
                  max="160"
                  step="10"
                  value={props.config.prettier.printWidth}
                  onChange={(e) => updatePrettier({printWidth: Number(e.target.value)})} />
                {props.config.prettier.printWidth}
              </Text>
              <Text>
                Tab Width:
                <Slider
                  type="range"
                  min="2"
                  max="8"
                  step="2"
                  value={props.config.prettier.tabWidth}
                  onChange={(e) => updatePrettier({tabWidth: Number(e.target.value)})} />
                {props.config.prettier.tabWidth}
              </Text>
              <Link onClick={() => updatePrettier({useTabs: !props.config.prettier.useTabs})}>
                Use Tabs {props.config.prettier.useTabs && '✅'}
              </Link>
              <Link onClick={() => updatePrettier({semi: !props.config.prettier.semi})}>
                Semicolons {props.config.prettier.semi && '✅'}
              </Link>
              <Link onClick={() => updatePrettier({singleQuote: !props.config.prettier.singleQuote})}>
                Single Quote {props.config.prettier.singleQuote && '✅'}
              </Link>
            </Sub>
          </Menu>
        </Off>
      )}
    </Container>
  )
}
