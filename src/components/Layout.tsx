import styled from '@emotion/styled'
import {css} from '@emotion/css'
import {background, foreground, primary, font} from '../config'
import {Config} from '..'

export const Layout = styled.div`
  display: flex;
  background: ${props => background(props.theme)};
  width: 100%;
  height: 100%;
  font-family: ${props => font(props.theme)};
  font-size: 18px;
  color: ${props => foreground(props.theme)};
  display: ${props => props.hidden ? 'none' : 'flex'};
  position: relative;
  .drop-cursor {
    background: ${props => primary(props.theme)} !important;
    height: 2px !important;
    opacity: 0.5;
  }
`

export const editorCss = (config: Config) => css`
  height: 100%;
  width: 100%;
  min-height: 100vh;
  max-height: 100vh;
  overflow-y: auto;
  padding: 0 50px;
  display: 'flex';
  justify-content: center;
  scrollbar-width: none;
  ::-webkit-scrollbar {
    display: none;
  }
  > [contenteditable] {
    min-height: calc(100% - 100px);
    height: fit-content;
    width: 100%;
    max-width: ${config.contentWidth}px;
    font-size: ${config.fontSize}px;
    font-family: ${font(config)};
    color: ${foreground(config)};
    margin-top: 50px;
    padding-bottom: 77vh;
    line-height: ${config.fontSize * 1.6}px;
    outline: none;
    background: transparent;
    h1, h2, h3, h4, h5, h6 {
      line-height: ${config.fontSize * 1.6}px;
    }
    h1 {
      font-size: ${config.fontSize * 1.8}px;
      line-height: ${config.fontSize * 2.3}px;
    }
    h2 {
      font-size: ${config.fontSize * 1.4}px;
    }
    h3 {
      font-size: ${config.fontSize * 1.2}px;
    }
    h4, h5, h6 {
      font-size: ${config.fontSize}px;
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
    blockquote {
      border-left: 10px solid ${foreground(config)}33;
      padding-left: 10px;
      margin: 0;
    }
    code {
      border: 1px solid ${foreground(config)}7f;
      background: ${foreground(config)}19;
      border-radius: 3px;
      padding: 2px;
      font-family: '${font(config, true)}' !important;
    }
    a {
      color: ${primary(config)};
    }
    table {
      width: 100%;
      margin: 5px 0;
      border-collapse: separate;
      border-spacing: 0;
      border-radius: 3px;
      border: 1px solid ${foreground(config)}7f;
      text-align: left;
      background: ${foreground(config)}19;
      th, td {
        padding: 5px 10px;
        vertical-align: top;
        border: 1px solid ${foreground(config)}7f;
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
      color: ${foreground(config)}4c;
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
      height: ${config.fontSize * 1.6}px;
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
        fill: ${foreground(config)}99;
        pointer-events: none;
        user-select: none;
      }
      &:hover > span {
        background: ${foreground(config)}19;
      }
    }
    h1 .handle {
      height: ${config.fontSize * 2.3}px;
    }
    .draggable:hover .handle {
      opacity: 1;
    }
    .codemirror-outer {
      position: relative;
      .handle {
        top: 2px;
      }
      .lang-toggle {
        position: absolute;
        right: -8px;
        height: ${config.fontSize * 1.6}px;
        display: flex;
        align-items: center;
        top: 2px;
        transform: translateX(100%);
        cursor: pointer;
        z-index: 10;
        user-select: none;
      }
      .codemirror-inner {
        position: relative;
        margin: 5px 0;
        padding: 0;
        font-family: '${font(config, true)}' !important;
        border: 1px solid ${foreground(config)}4c;
        border-radius: 3px;
        .lang-select {
          .lang-input {
            outline: none;
          }
        }
        .cm-editor {
          outline: none;
          .cm-content {
            padding: 0;
          }
          .cm-line {
            line-height: ${config.fontSize * 1.8}px;
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
          bottom: 2px;
          cursor: pointer;
          z-index: 10;
          user-select: none;
        }
      }
    }
    .todo-item {
      display: flex;
      align-items: center;
      &.done {
        text-decoration: line-through;
        color: ${foreground(config)}4c;
      }
      label {
        margin-right: 10px;
        user-select: none;
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
        box-shadow: 0 0 0 2px ${primary(config)};
        border-radius: 3px;
      }
    }
  }
`
