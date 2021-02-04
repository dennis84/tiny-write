import React, {useEffect} from 'react'
import {EditorView} from 'prosemirror-view'
import {css} from '@emotion/css'
import {useTheme} from '@emotion/react'
import {Config, File} from '..'
import {rgb, rgba} from '../styles'
import {codeTheme, color, color2, font} from '../config'
import {UpdateText, useDispatch} from '../reducer'
import {ProseMirror, ProseMirrorState} from '../prosemirror/prosemirror'
import {updateOptions} from '../prosemirror/code-block'

interface Props {
  text: ProseMirrorState;
  lastModified?: Date;
  files: File[];
  config: Config;
  editorViewRef: React.RefObject<EditorView>;
}

export default (props: Props) => {
  const dispatch = useDispatch()
  const theme = useTheme()

  const editorCss = css`
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
    > [contenteditable] {
      min-height: calc(100% - 100px);
      height: fit-content;
      width: 100%;
      max-width: 800px;
      font-size: ${theme.fontSize}px;
      font-family: ${font(theme)};
      color: ${rgb(color(theme))};
      margin-top: 50px;
      padding-bottom: 77vh;
      line-height: 160%;
      outline: none;
      background: transparent;
      -webkit-app-region: no-drag;
      h1, h2, h3, h4, h5, h6 {
        line-height: 120%;
      }
      p {
        margin: 0;
        &::after {
          content: "";
          display: table;
          clear: both;
        }
      }
      blockquote {
        border-left: 10px solid ${rgba(color(theme), 0.2)};
        margin: 0;
        padding-left: 20px;
      }
      code {
        border: 1px solid ${rgba(color(theme), 0.5)};
        background: ${rgba(color(theme), 0.1)};
        border-radius: 2px;
        padding: 2px;
        font-family: '${font(theme, true)}' !important;
      }
      a {
        color: ${rgba(color2(theme), 1)};
      }
      p img {
        max-width: 100%;
        float: left;
        margin-right: 10px;
        margin-bottom: 10px;
        cursor: default;
      }
      .placeholder {
        color: ${rgba(color(theme), 0.3)};
        position: absolute;
        pointer-events: none;
        user-select: none;
      }
      .codemirror-container {
        position: relative;
        .lang-select {
          .lang-input {
            outline: none;
          }
        }
        .cm-wrap {
          border-radius: 2px;
          margin: 10px 0;
          box-shadow: inset 0 0 0 1px ${rgba(color(theme), 0.3)};
          font-family: '${font(theme, true)}' !important;
          outline: none;
          .cm-line {
            line-height: 150%;
          }
        }
        .lang-toggle {
          position: absolute;
          top: 4px;
          right: -10px;
          transform: translateX(100%);
          cursor: pointer;
          z-index: 10;
          user-select: none;
          -webkit-app-region: no-drag;
        }
        .prettify {
          position: absolute;
          right: 8px;
          bottom: 4px;
          cursor: pointer;
          z-index: 10;
          user-select: none;
        }
      }
      .todo-list {
        > div {
          display: flex;
          align-items: center;
          &.done {
            text-decoration: line-through;
            color: ${rgba(color(theme), 0.3)};
          }
          input {
            margin-right: 10px;
          }
        }
      }
      .ProseMirror-selectednode {
        box-shadow: 0 0 0 2px ${rgba(color2(theme), 1)};
        border-radius: 2px;
      }
    }
  `

  const OnChange = (value: ProseMirrorState) => {
    dispatch(UpdateText(value))
  }

  useEffect(() => {
    if (!props.editorViewRef.current) return
    updateOptions(props.editorViewRef.current, {
      theme: codeTheme(props.config),
      fontSize: props.config.fontSize,
      typewriterMode: props.config.typewriterMode,
    })
  }, [props.config.codeTheme, props.config.fontSize, props.config.typewriterMode])

  return (
    <ProseMirror
      editorViewRef={props.editorViewRef}
      className={editorCss}
      state={props.text}
      onChange={OnChange}
      onInit={OnChange} />
  )
}
