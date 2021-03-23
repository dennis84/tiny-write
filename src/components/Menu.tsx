import React, {useEffect, useState} from 'react'
import {EditorState} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {undo, redo} from 'prosemirror-history'
import {deleteSelection, selectAll} from 'prosemirror-commands'
import {differenceInHours, format} from 'date-fns'
import {io} from 'socket.io-client'
import styled from '@emotion/styled'
import {css} from '@emotion/react'
import {Config, File, Collab} from '..'
import {
  Discard,
  UpdateCollab,
  New,
  Open,
  UpdateConfig,
  ToggleFullscreen,
  useDispatch,
} from '../reducer'
import {color, color2, themes, fonts, codeThemes} from '../config'
import {rgb, rgba} from '../styles'
import {isElectron, isMac, alt, mod, COLLAB_URL} from '../env'
import * as remote from '../remote'
import {isEmpty} from '../prosemirror/prosemirror'

const Container = styled.div`
  position: relative;
  flex-shrink: 0;
  flex-grow: 1;
  height: 100%;
  -webkit-app-region: no-drag;
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
  -webkit-app-region: no-drag;
  > span {
    background: ${props => rgba(color(props.theme), 0.4)};
    height: 2px;
    width: 100%;
    border-radius: 4px;
    transition: 0.4s;
  }
  &:hover > span {
    background: ${props => rgba(color(props.theme), 0.6)};
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
  background: ${props => rgba(color(props.theme), 0.1)};
  padding: 20px;
  height: 100%;
  min-width: 460px;
  overflow-y: auto;
  ::-webkit-scrollbar {
    display: none;
  }
`

const Menu = styled.div``

const Label = styled.h3`
  margin: 0;
  font-size: 14px;
  text-transform: uppercase;
  color: ${props => rgba(color(props.theme), 0.5)};
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
  color: ${rgb(color(props.theme))};
  font-size: 18px;
  line-height: 24px;
  font-family: 'JetBrains Mono';
  white-space: nowrap;
  > i {
    justify-self: flex-end;
    margin-left: auto;
    color: ${rgba(color(props.theme), 0.5)};
  }
`

const Text = styled.p`
  ${Item}
`

const Link = styled.button`
  ${Item}
  background: none;
  border: 0;
  cursor: pointer;
  &:hover {
    color: ${props => rgb(color2(props.theme))};
  };
  &[disabled] {
    color: ${props => rgba(color(props.theme), 0.6)};
    cursor: not-allowed;
  }
`

const Slider = styled.input`
  -webkit-app-region: no-drag;
`

interface Props {
  text?: EditorState;
  lastModified?: Date;
  files: File[];
  config: Config;
  fullscreen: boolean;
  collab?: Collab;
  editorViewRef: React.RefObject<EditorView>;
}

export default (props: Props) => {
  const dispatch = useDispatch()
  const [show, setShow] = useState(false)
  const [version, setVersion] = useState<string>()
  const [lastAction, setLastAction] = useState<string | undefined>()
  const editorView = props.editorViewRef.current

  useEffect(() => {
    if (!show) return
    const onKeyDown = (e) => {
      if (e.keyCode === 27) setShow(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [show])

  useEffect(() => {
    remote.getVersion().then(setVersion)
  }, [])

  const OnBurgerClick = () => {
    editorView.focus()
    setShow(!show)
  }

  const OnUndo = () => {
    undo(editorView.state, editorView.dispatch)
    editorView.focus()
  }

  const OnRedo = () => {
    redo(editorView.state, editorView.dispatch)
    editorView.focus()
  }

  const Cmd = (cmd: string) => () => {
    document.execCommand(cmd)
    setLastAction(cmd)
    editorView.focus()
  }

  const OnCopyAllAsMd = () => {
    remote.copyAllAsMarkdown(editorView.state).then(() => {
      editorView.focus()
      setLastAction('copy-md')
    })
  }

  const OnChangeTheme = (theme) => () => {
    dispatch(UpdateConfig({...props.config, theme}))
    editorView.focus()
  }

  const OnChangeCodeTheme = (codeTheme) => () => {
    dispatch(UpdateConfig({...props.config, codeTheme}))
    editorView.focus()
  }

  const OnChangeFont = (font) => () => {
    dispatch(UpdateConfig({...props.config, font}))
    editorView.focus()
  }

  const OnChangeFontSize = (e) => {
    dispatch(UpdateConfig({...props.config, fontSize: parseInt(e.target.value)}))
    editorView.focus()
  }

  const OnToggleAlwaysOnTop = () => {
    dispatch(UpdateConfig({...props.config, alwaysOnTop: !props.config.alwaysOnTop}))
    editorView.focus()
  }

  const OnToggleTypewriterMode = () => {
    dispatch(UpdateConfig({...props.config, typewriterMode: !props.config.typewriterMode}))
    editorView.focus()
  }

  const OnToggleDragHandle = () => {
    dispatch(UpdateConfig({...props.config, dragHandle: !props.config.dragHandle}))
    editorView.focus()
  }

  const OnToggleFullscreen = () => {
    dispatch(ToggleFullscreen)
  }

  const OnVersion = () => {
    remote.getVersionUrl().then((url) => window.open(url, '_blank'))
  }

  const OnNew = () => {
    dispatch(New)
    setTimeout(() => editorView.focus())
  }

  const OnDiscard = () => {
    if (props.files.length > 0 && isEmpty(props.text?.editorState)) {
      dispatch(Discard)
    } else {
      selectAll(editorView.state, editorView.dispatch)
      deleteSelection(editorView.state, editorView.dispatch)
    }
  }

  const OnCollab = () => {
    if (props.collab) {
      window.history.replaceState(null, '', '/')
      props.collab.socket.close()
      dispatch(UpdateCollab(undefined))
    } else {
      const socket = io(COLLAB_URL, {transports: ['websocket']})
      dispatch(UpdateCollab({socket}))
    }

    editorView.focus()
  }

  const OnCopyCollabLink = () => {
    remote.copy(`http://localhost:3000/${props.collab.room}`).then(() => {
      editorView.focus()
      setLastAction('copy-collab-link')
    })
  }

  const TextStats = () => {
    let paragraphs = 0
    let words = 0
    let loc = 0

    if (props.text?.initialized) {
      props.text?.editorState?.doc.forEach((node) => {
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
      <Text>Last modified {formatDate(props.lastModified)}</Text>
    ) : (
      <Text>Nothing yet</Text>
    )
  }

  const filePreview = (file: File, length: number) => {
    const getText = (node) => {
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

    return getText(file.text?.doc).substring(0, length)
  }

  useEffect(() => {
    setLastAction(undefined)
  }, [props.lastModified])

  return (
    <Container>
      <Burger onClick={OnBurgerClick} active={show}>
        <span />
        <span />
        <span />
      </Burger>
      {show && (
        <Off onClick={() => editorView.focus()}>
          <Menu>
            <Label>Stats</Label>
            <Sub>
              <LastModified />
              <TextStats />
            </Sub>
            <Label>Collab</Label>
            <Sub>
              <Link onClick={OnCollab}>{props.collab ? 'Stop' : 'Start'}</Link>
              {props.collab && (
                <Link onClick={OnCopyCollabLink}>
                  Copy Link {lastAction === 'copy-collab-link' && '📋'}
                </Link>
              )}
              {props.collab?.users?.length > 0 && (
                <Text>
                  {props.collab.users.length} {props.collab.users?.length === 1 ? 'user' : 'users'} connected
                </Text>
              )}
            </Sub>
            <Label>File</Label>
            <Sub>
              <Link onClick={OnNew}>New <i>({mod}+n)</i></Link>
              <Link
                onClick={OnDiscard}
                disabled={props.files.length === 0 && isEmpty(props.text?.editorState)}>
                {(props.files.length > 0 && isEmpty(props.text?.editorState)) ? 'Discard ⚠️' : 'Clear'} <i>({mod}+w)</i>
              </Link>
            </Sub>
            {props.files.length > 0 && (
              <>
                <Label>Files</Label>
                <Sub>
                  {props.files.map((file) => (
                    <Link
                      key={file.lastModified}
                      onClick={() => dispatch(Open(file))}>
                      {filePreview(file, 16)}
                    </Link>
                  ))}
                </Sub>
              </>
            )}
            <Label>Edit</Label>
            <Sub>
              <Link onClick={OnUndo}>Undo <i>({mod}+z)</i></Link>
              <Link onClick={OnRedo}>Redo <i>({mod}+{isMac ? 'Shift+z' : 'y'})</i></Link>
              <Link onClick={Cmd('cut')}>Cut <i>({mod}+x)</i></Link>
              <Link onClick={Cmd('paste')}>Paste <i>({mod}+p)</i></Link>
              <Link onClick={Cmd('copy')}>Copy {lastAction === 'copy' && '📋'} <i>({mod}+c)</i></Link>
              <Link onClick={OnCopyAllAsMd}>
                Copy all as markdown {lastAction === 'copy-md' && '📋'}
              </Link>
            </Sub>
            <Label>Theme</Label>
            <Sub>
              {Object.entries(themes).map(([key, value]) => (
                <Link key={key} onClick={OnChangeTheme(key)}>
                  {value.label}{' '}{key === props.config.theme && '✅'}
                </Link>
              ))}
            </Sub>
            <Label>Code</Label>
            <Sub>
              {Object.entries(codeThemes).map(([key, value]) => (
                <Link key={key} onClick={OnChangeCodeTheme(key)}>
                  {value.label}{' '}{key === props.config.codeTheme && '✅'}
                </Link>
              ))}
            </Sub>
            <Label>Font</Label>
            <Sub>
              {Object.entries(fonts).map(([key, value]) => (
                <Link key={key} onClick={OnChangeFont(key)}>
                  {value.label}{' '}{key === props.config.font && '✅'}
                </Link>
              ))}
              <Text>
                Font size:
                <Slider
                  type="range"
                  min="8"
                  max="48"
                  value={props.config.fontSize}
                  onChange={OnChangeFontSize} />
                {props.config.fontSize}
              </Text>
            </Sub>
            <Label>View</Label>
            <Sub>
              {isElectron && (
                <Link onClick={OnToggleFullscreen}>
                  Fullscreen {props.fullscreen && '✅'}<i>({alt}+Enter)</i>
                </Link>
              )}
              <Link onClick={OnToggleTypewriterMode}>
                Typewriter mode {props.config.typewriterMode && '✅'}
              </Link>
              <Link onClick={OnToggleDragHandle}>
                Drag handle {props.config.dragHandle && '✅'}
              </Link>
              {isElectron && (
                <Link onClick={OnToggleAlwaysOnTop}>
                  Always on Top {props.config.alwaysOnTop && '✅'}
                </Link>
              )}
            </Sub>
            <Label>Application</Label>
            <Sub>
              <Link onClick={OnVersion}>
                About Version {version}
              </Link>
              {isElectron && <Link onClick={() => remote.quit()}>Quit <i>({mod}+q)</i></Link>}
            </Sub>
          </Menu>
        </Off>
      )}
    </Container>
  )
}
