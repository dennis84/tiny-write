import React, {useEffect} from 'react'
import {EditorState} from 'prosemirror-state'
import styled from '@emotion/styled'
import {Config, File} from '..'
import {rgb, rgba} from '../styles'
import {codeTheme, color, color2, font} from '../config'
import {UpdateText, useDispatch} from '../reducer'
import {createEmptyState} from '../prosemirror'
import {ProseMirror, defaultSchema, useProseMirror} from './ProseMirror'

const Container = styled.div`
  height: 100%;
  width: 100%;
  min-height: 100vh;
  max-height: 100vh;
  overflow-y: auto;
  padding: 0 50px;
  display: flex;
  justify-content: center;
  ::-webkit-scrollbar {
    display: none;
  }
  > div {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  > div > [contenteditable] {
    min-height: calc(100% - 100px);
    height: fit-content;
    width: 100%;
    max-width: 800px;
    font-size: ${props => props.theme.fontSize}px;
    font-family: ${props => font(props.theme)};
    color: ${props => rgb(color(props.theme))};
    margin-top: 50px;
    padding-bottom: 77vh;
    line-height: 160%;
    outline: none;
    background: transparent;
    -webkit-app-region: no-drag;
    &::-webkit-scrollbar {
      display: none;
    }
    h1, h2, h3, h4, h5, h6 {
      line-height: 120%;
    }
    p {
      margin: 0;
    }
    blockquote {
      border-left: 10px solid ${props => rgba(color(props.theme), 0.2)};
      margin: 0;
      padding-left: 20px;
    }
    code {
      border: 1px solid ${props => rgba(color(props.theme), 0.5)};
      background: ${props => rgba(color(props.theme), 0.1)};
      border-radius: 2px;
      padding: 2px;
    }
    a {
      color: ${props => rgba(color2(props.theme), 1)};
    }
    img {
      max-width: 100%;
    }
    .placeholder {
      color: ${props => rgba(color(props.theme), 0.3)};
      position: absolute;
      pointer-events: none;
      user-select: none;
    }
    .CodeMirror {
      height: auto;
      border-radius: 2px;
    }
  }
`

interface Props {
  text?: EditorState;
  lastModified?: Date;
  files: File[];
  config: Config;
}

export default (props: Props) => {
  const dispatch = useDispatch()
  const proseMirror = useProseMirror()

  const OnChange = (value: EditorState) => {
    dispatch(UpdateText(value))
  }

  useEffect(() => {
    if (!proseMirror) return
    const tr = proseMirror.state.tr
    tr.setMeta('code-block-options', {
      theme: codeTheme(props.config),
    })
    proseMirror.dispatch(tr)
  }, [props.config.codeTheme])

  return (
    <Container>
      <ProseMirror
        state={props.text ?? createEmptyState(dispatch, defaultSchema)}
        onChange={OnChange} />
    </Container>
  )
}
