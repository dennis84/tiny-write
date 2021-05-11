import React from 'react'
import {EditorView} from 'prosemirror-view'
import {css} from '@emotion/css'
import {useTheme} from '@emotion/react'
import {Config, File} from '..'
import {rgba} from '../styles'
import {color, color2, font} from '../config'
import {UpdateText, useDispatch} from '../reducer'
import {ProseMirror, ProseMirrorState} from '../prosemirror/prosemirror'

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
    scrollbar-width: none;
    ::-webkit-scrollbar {
      display: none;
    }
    > [contenteditable] {
      min-height: calc(100% - 100px);
      height: fit-content;
      width: 100%;
      max-width: ${theme.contentWidth}px;
      font-size: ${theme.fontSize}px;
      font-family: ${font(theme)};
      color: ${rgba(color(theme))};
      margin-top: 50px;
      padding-bottom: 77vh;
      line-height: ${theme.fontSize * 1.6}px;
      outline: none;
      background: transparent;
      -webkit-app-region: no-drag;
      h1, h2, h3, h4, h5, h6 {
        line-height: ${theme.fontSize * 1.6}px;
      }
      h1 {
        font-size: ${theme.fontSize * 1.8}px;
        line-height: ${theme.fontSize * 2.3}px;
      }
      h2 {
        font-size: ${theme.fontSize * 1.4}px;
      }
      h3 {
        font-size: ${theme.fontSize * 1.2}px;
      }
      h4, h5, h6 {
        font-size: ${theme.fontSize}px;
      }
      p {
        margin: 0;
        &::after {
          content: "";
          display: table;
          clear: both;
        }
      }
      ul li, ol li {
        margin-left: 30px;
      }
      blockquote p {
        border-left: 10px solid ${rgba(color(theme), 0.2)};
        margin: 0;
        padding-left: 10px;
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
      .placeholder {
        color: ${rgba(color(theme), 0.3)};
        position: absolute;
        pointer-events: none;
        user-select: none;
      }
      .draggable {
        position: relative;
        margin-left: -30px;
        padding-left: 30px;
      }
      .handle {
        position: absolute;
        left: 0;
        top: 0;
        opacity: 0;
        cursor: move;
        transition: opacity 0.3s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: ${theme.fontSize * 1.6}px;
        > span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          padding: 6px;
          fill: ${rgba(color(theme), 0.6)};
          -webkit-app-region: no-drag;
          pointer-events: none;
          user-select: none;
        }
        &:hover > span {
          background: ${rgba(color(theme), 0.1)};
        }
      }
      h1 .handle {
        height: ${theme.fontSize * 2.3}px;
      }
      .draggable:hover .handle {
        opacity: 1;
      }
      .codemirror-outer {
        position: relative;
        .codemirror-inner {
          position: relative;
          padding: 5px 0;
          font-family: '${font(theme, true)}' !important;
          border: 1px solid ${rgba(color(theme), 0.3)};
          .lang-select {
            .lang-input {
              outline: none;
            }
          }
          .cm-wrap {
            border-radius: 2px;
            outline: none;
            .cm-line {
              line-height: 1.6;
            }
            .cm-diagnosticText {
              white-space: pre;
            }
            .cm-scroller {
              -ms-overflow-style: none;
              scrollbar-width: none;
              &::-webkit-scrollbar {
                display: none;
              }
            }
          }
          .lang-toggle {
            position: absolute;
            top: 1px;
            right: -8px;
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
      }
      .todo-item {
        display: flex;
        align-items: center;
        -webkit-app-region: no-drag;
        user-select: none;
        &.done {
          text-decoration: line-through;
          color: ${rgba(color(theme), 0.3)};
        }
        input {
          margin-right: 10px;
        }
      }
      .image-container {
        position: relative;
        float: left;
        max-width: 100%;
        margin-right: 10px;
        margin-bottom: 10px;
        cursor: default;
        line-height: 0;
        img {
          width: 100%;
        }
        .resize-handle {
          position: absolute;
          width: 40px;
          height: 40px;
          bottom: -5px;
          right: -5px;
          cursor: nwse-resize;
        }
        &.ProseMirror-selectednode {
          box-shadow: 0 0 0 2px ${rgba(color2(theme), 1)};
          border-radius: 2px;
        }
      }
    }
  `

  const OnInit = (value: ProseMirrorState) => {
    props.editorViewRef.current.focus()
    dispatch(UpdateText(value))
  }

  const OnChange = (value: ProseMirrorState) => {
    dispatch(UpdateText(value, new Date()))
  }

  return (
    <ProseMirror
      editorViewRef={props.editorViewRef}
      className={editorCss}
      state={props.text}
      onChange={OnChange}
      onInit={OnInit} />
  )
}
