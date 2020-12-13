import React, {useState} from 'react'
import {EditorState} from 'prosemirror-state'
import {undo, redo} from 'prosemirror-history'
import {deleteSelection, selectAll} from 'prosemirror-commands'
import {differenceInHours, format} from 'date-fns'
import styled from '@emotion/styled'
import {css} from '@emotion/react'
import {Config, File} from '..'
import {Discard, New, Open, UpdateConfig, ToggleAlwaysOnTop, useDispatch} from '../reducer'
import {color, color2, themes, fonts, codeThemes} from '../config'
import {rgb, rgba} from '../styles'
import {isElectron, isMac, mod} from '../env'
import * as remote from '../remote'
import {isEmpty, useProseMirror} from './ProseMirror'

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
  }
  &:hover > span {
    background: ${props => rgba(color(props.theme), 0.6)};
  };
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
  alwaysOnTop: boolean;
}

export default (props: Props) => {
  const dispatch = useDispatch()
  const editorView = useProseMirror()
  const [show, setShow] = useState(false)

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
    editorView.focus()
  }

  const OnCopyAllAsMd = () => {
    remote.copyAllAsMarkdown(editorView.state)
    editorView.focus()
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
    dispatch(ToggleAlwaysOnTop)
    editorView.focus()
  }

  const OnVersion = () => {
    window.open(remote.getVersionUrl(), '_blank')
  }

  const OnDiscard = () => {
    if (props.files.length > 0 && isEmpty(props.text)) {
      dispatch(Discard)
    } else {
      selectAll(editorView.state, editorView.dispatch)
      deleteSelection(editorView.state, editorView.dispatch)
    }
  }

  const TextStats = () => {
    let paragraphs = 0
    let words = 0
    let loc = 0

    props.text?.doc.forEach((node) => {
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

      return format(date, 'dd MMMM YYYY HH:mm:ss')
    }

    return props.lastModified ? (
      <Text>Last modified {formatDate(props.lastModified)}</Text>
    ) : (
      <Text>Nothing yet</Text>
    )
  }

  return (
    <Container>
      <Burger onClick={OnBurgerClick}>
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
            <Label>File</Label>
            <Sub>
              <Link onClick={() => dispatch(New)}>New <i>({mod}+n)</i></Link>
              <Link
                onClick={OnDiscard}
                disabled={props.files.length === 0 && isEmpty(props.text)}>
                {(props.files.length > 0 && isEmpty(props.text)) ? 'Discard ⚠️' : 'Clear'} <i>({mod}+w)</i>
              </Link>
            </Sub>
            {props.files.length > 0 && (
              <>
                <Label>Files</Label>
                <Sub>
                  {props.files.map((file) => (
                    <Link
                      key={file.lastModified.toString()}
                      onClick={() => dispatch(Open(file))}>
                      {file.text.doc.textContent.substring(0, 16)}
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
              <Link onClick={Cmd('copy')}>Copy <i>({mod}+c)</i></Link>
              <Link onClick={OnCopyAllAsMd}>Copy all as markdown</Link>
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
            <Label>Application</Label>
            <Sub>
              {isElectron && (
                <Link onClick={OnToggleAlwaysOnTop}>
                  Always on Top {props.alwaysOnTop && '✅'}
                </Link>
              )}
              <Link onClick={OnVersion}>
                About Version {remote.getVersion()}
              </Link>
              {isElectron && <Link onClick={() => remote.quit()}>Quit <i>({mod}+q)</i></Link>}
            </Sub>
          </Menu>
        </Off>
      )}
    </Container>
  )
}
