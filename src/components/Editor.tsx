import React from 'react'
import {EditorView} from 'prosemirror-view'
import {css} from '@emotion/css'
import {useTheme} from '@emotion/react'
import {Config, Collab, File} from '..'
import {color, color2, font} from '../config'
import {UpdateText, useDispatch} from '../reducer'
import {ProseMirror} from '../prosemirror/editor'
import {ProseMirrorState, isInitialized} from '../prosemirror/state'
import {createState} from '../prosemirror'

interface Props {
  text: ProseMirrorState;
  lastModified?: Date;
  files: File[];
  config: Config;
  path?: string;
  collab?: Collab;
  markdown: boolean;
  keymap: {[key: string]: any};
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
      color: ${color(theme)};
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
      > ul > li, > ol > li {
        margin-left: 30px;
      }
      blockquote p {
        border-left: 10px solid ${color(theme)}33;
        margin: 0;
        padding-left: 10px;
      }
      code {
        border: 1px solid ${color(theme)}7f;
        background: ${color(theme)}19;
        border-radius: 3px;
        padding: 2px;
        font-family: '${font(theme, true)}' !important;
      }
      a {
        color: ${color2(theme)};
      }
      table {
        width: 100%;
        margin: 5px 0;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 3px;
        border: 1px solid ${color(theme)}7f;
        text-align: left;
        background: ${color(theme)}19;
        th, td {
          padding: 5px 10px;
          vertical-align: top;
          border: 1px solid ${color(theme)}7f;
          border-top: 0;
          border-right: 0;
        }
        th:first-child, td:first-child {
          border-left: 0;
        }
        tr:last-child td {
          border-bottom: 0;
        }
      }
      .placeholder {
        color: ${color(theme)}4c;
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
        height: ${theme.fontSize * 1.6}px;
        opacity: 0;
        cursor: move;
        transition: opacity 0.3s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        > span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          padding: 6px;
          fill: ${color(theme)}99;
          -webkit-app-region: no-drag;
          pointer-events: none;
          user-select: none;
        }
        &:hover > span {
          background: ${color(theme)}19;
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
        .handle {
          top: 8px;
        }
        .lang-toggle {
          position: absolute;
          right: -8px;
          height: ${theme.fontSize * 1.6}px;
          display: flex;
          align-items: center;
          top: 8px;
          transform: translateX(100%);
          cursor: pointer;
          z-index: 10;
          user-select: none;
          -webkit-app-region: no-drag;
        }
        .codemirror-inner {
          position: relative;
          margin: 5px 0;
          padding: 5px 0;
          font-family: '${font(theme, true)}' !important;
          border: 1px solid ${color(theme)}4c;
          border-radius: 3px;
          .lang-select {
            .lang-input {
              outline: none;
            }
          }
          .cm-editor {
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
            .cm-lineWrapping {
              word-break: break-all;
            }
            &:not(.cm-focused) {
              .cm-activeLine {
                background: none;
              }
            }
          }
          .prettify {
            position: absolute;
            right: 8px;
            bottom: 8px;
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
          color: ${color(theme)}4c;
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
          box-shadow: 0 0 0 2px ${color2(theme)};
          border-radius: 3px;
        }
      }
    }
  `

  const onInit = (value: ProseMirrorState) => {
    props.editorViewRef.current.focus()
    dispatch(UpdateText(value))
  }

  const onChange = (value: ProseMirrorState) => {
    dispatch(UpdateText(value, new Date()))
  }

  const onReconfigure = (state: ProseMirrorState) => {
    if (isInitialized(state.editorState)) return state
    return createState({
      data: state.editorState,
      config: props.config,
      markdown: props.markdown,
      path: props.path,
      keymap: props.keymap,
      y: props.collab?.y,
    })
  }

  return (
    <ProseMirror
      editorViewRef={props.editorViewRef}
      className={editorCss}
      state={props.text}
      onChange={onChange}
      onReconfigure={onReconfigure}
      onInit={onInit} />
  )
}
