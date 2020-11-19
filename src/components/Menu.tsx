import React, {useState} from 'react'
import {EditorState} from 'prosemirror-state'
import {undo, redo} from 'prosemirror-history'
import {differenceInHours, format} from 'date-fns'
import styled from '@emotion/styled'
import {Config, File} from '..'
import {Discard, New, Open, UpdateConfig, ToggleAlwaysOnTop, useDispatch} from '../reducer'
import {color, themes, fonts, codeThemes} from '../config'
import {rgb, rgba} from '../styles'
import {isElectron} from '../env'
import * as remote from '../remote'
import {useProseMirror} from './ProseMirror'

const Container = styled.div`
  position: relative;
  flex-shrink: 0;
  flex-grow: 1;
  height: 100%;
  -webkit-app-region: no-drag;
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
    background: ${props => rgba(color(props.theme), 0.3)};
    height: 2px;
    width: 100%;
    border-radius: 4px;
  }
`

const Off = styled.div`
  background: ${props => rgba(color(props.theme), 0.1)};
  padding: 20px;
  height: 100%;
  min-width: 400px;
  overflow-y: auto;
  ::-webkit-scrollbar {
    display: none;
  }
`

const Menu = styled.div`
  > label {
    font-size: 20px;
  }
`

const Label = styled.h3`
  margin: 0;
  font-size: 16px;
  text-transform: uppercase;
`

const Sub = styled.nav`
  margin: 10px 0;
  margin-bottom: 30px;
`

const Item = styled.p`
  cursor: pointer;
  padding: 2px 0;
  margin: 0;
  display: flex;
  align-items: center;
  color: ${props => rgb(color(props.theme))};
  white-space: nowrap;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  };
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

  const OnUndo = () => {
    undo(editorView.state, editorView.dispatch)
  }

  const OnRedo = () => {
    redo(editorView.state, editorView.dispatch)
  }

  const Cmd = (cmd) => () => {
    document.execCommand(cmd)
  }

  const OnCopyAllAsMd = () => {
    remote.copyAllAsMarkdown(editorView.state)
  }

  const OnVersion = () => {
    window.open(`https://github.com/dennis84/tiny-write/releases/tag/v${remote.getVersion()}`, '_blank')
  }

  const WordCount = () => {
    let count = 0
    props.text?.doc.forEach((node) => {
      count += node.textContent.split(/\s+/).filter(x => x != '').length
    }) ?? 0

    return (
      <Item>{count} words</Item>
    )
  }

  const LastModified = () => {
    const formatDate = (date: Date) => {
      const now = new Date()

      if (differenceInHours(now, date) <= 24) {
        return format(date, 'HH:mm:ss')
      } else if (date.getFullYear() === now.getFullYear()) {
        return format(date, 'dd MMMM')
      }

      return format(date, 'dd MMMM YYYY')
    }

    return props.lastModified ? (
      <Item>Edited {formatDate(props.lastModified)}</Item>
    ) : (
      <Item>Nothing yet</Item>
    )
  }

  return (
    <Container>
      <Burger onClick={() => setShow(!show)}>
        <span />
        <span />
        <span />
      </Burger>
      {show && (
        <Off>
          <Menu>
            <Label>Stats</Label>
            <Sub>
              <WordCount />
              <LastModified />
            </Sub>
            <Label>File</Label>
            <Sub>
              <Item onClick={() => dispatch(New)}>New</Item>
              <Item onClick={() => dispatch(Discard)}>Discard</Item>
            </Sub>
            {props.files.length > 0 && (
              <>
                <Label>Files</Label>
                <Sub>
                  {props.files.map((file) => (
                    <Item
                      key={file.lastModified.toString()}
                      onClick={() => dispatch(Open(file))}>
                      {file.text.doc.textContent.substring(0, 16)}
                    </Item>
                  ))}
                </Sub>
              </>
            )}
            <Label>Edit</Label>
            <Sub>
              <Item onClick={OnUndo}>Undo</Item>
              <Item onClick={OnRedo}>Redo</Item>
              <Item onMouseDown={Cmd('cut')}>Cut</Item>
              <Item onMouseDown={Cmd('copy')}>Copy</Item>
              <Item onClick={OnCopyAllAsMd}>Copy all as markdown</Item>
            </Sub>
            <Label>Theme</Label>
            <Sub>
              {Object.entries(themes).map(([key, value]) => (
                <Item
                  key={key}
                  onClick={() => dispatch(UpdateConfig({...props.config, theme: key}))}>
                  {value.label}
                  {key === props.config.theme && <input type="checkbox" defaultChecked={true} />}
                </Item>
              ))}
            </Sub>
            <Label>Code</Label>
            <Sub>
              {Object.entries(codeThemes).map(([key, value]) => (
                <Item
                  key={key}
                  onClick={() => dispatch(UpdateConfig({...props.config, codeTheme: key}))}>
                  {value.label}
                  {key === props.config.codeTheme && <input type="checkbox" defaultChecked={true} />}
                </Item>
              ))}
            </Sub>
            <Label>Font</Label>
            <Sub>
              {Object.entries(fonts).map(([key, value]) => (
                <Item
                  key={key}
                  onClick={() => dispatch(UpdateConfig({...props.config, font: key}))}>
                  {value.label}
                  {key === props.config.font && <input type="checkbox" defaultChecked={true} />}
                </Item>
              ))}
            </Sub>
            <Label>Application</Label>
            <Sub>
              {isElectron && (
                <Item onClick={() => dispatch(ToggleAlwaysOnTop)}>
                  Always on Top
                  {props.alwaysOnTop && <input type="checkbox" defaultChecked={true} />}
                </Item>
              )}
              <Item onClick={OnVersion}>
                About Version {remote.getVersion()}
              </Item>
              {isElectron && <Item onClick={() => remote.quit()}>Quit</Item>}
            </Sub>
          </Menu>
        </Off>
      )}
    </Container>
  )
}
