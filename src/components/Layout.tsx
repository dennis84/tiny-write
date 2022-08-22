import {splitProps} from 'solid-js'
import {css} from '@emotion/css'
import {background, foreground, primaryBackground, font, selection} from '../config'
import {Config} from '../state'

export type Styled = {
  children: any;
  config: Config;
  [key: string]: any;
}

export const Layout = (props: Styled) => {
  const [local, others] = splitProps(props, ['config', 'children'])
  return (
    <div
      {...others}
      class={css`
        background: ${background(local.config)};
        display: flex;
        width: 100%;
        height: 100%;
        font-family: ${font(local.config)};
        font-size: 18px;
        color: ${foreground(local.config)};
        position: relative;
        .drop-cursor {
          background: ${primaryBackground(local.config)} !important;
          height: 2px !important;
          opacity: 0.5;
        }
        .mouse-cursor {
          position: absolute;
          height: 10px;
          margin-left: -15px;
          z-index: 20;
          pointer-events: none;
          user-select: none;
          span {
            position: absolute;
            display: inline-flex;
            align-items: center;
            height: 20px;
            top: 20px;
            right: 0;
            line-height: 0;
            white-space: nowrap;
            padding: 4px;
            font-family: 'JetBrains Mono';
            font-size: 12px;
            border-radius: 4px;
          }
          &::before, &::after {
            content: '';
            transform: rotate(148deg);
            position: absolute;
            width: 10px;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 10px solid var(--user-background);
          }
          &::before {
            transform: rotate(148deg);
            left: 0
          }
          &::after {
            transform: rotate(-77deg);
            left: -1px;
            top: -1px;
          }
        }
      `}
    >{local.children}</div>
  )
}

export const editorCss = (config: Config) => css`
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
    position: relative;
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
    p.truncate {
      overflow: hidden;
      max-width: 75ch;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    p {
      margin: 0;
      display: flow-root;
    }
    > ul, ol {
      padding: 0;
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
      padding: 1px;
      font-family: '${font(config, true)}' !important;
    }
    a {
      color: ${primaryBackground(config)};
    }
    .table-container {
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
          position: relative;
        }
        th:first-child, td:first-child {
          border-left: 0;
        }
        th {
          border-bottom-width: 2px;
        }
        tr:last-child td {
          border-bottom: 0;
        }
      }
      .table-menu-right,
      .table-menu-left,
      .table-menu-bottom {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        font-size: 12px;
        user-select: none;
        z-index: 1;
        background: ${background(config)};
        border: 1px solid ${foreground(config)}7f;
        border-radius: 3px;
      }
      .table-menu-right {
        top: calc(50% - 10px);
        right: -5px;
        width: 10px;
        height: 20px;
      }
      .table-menu-left {
        top: calc(50% - 10px);
        left: -5px;
        width: 10px;
        height: 20px;
      }
      .table-menu-bottom {
        left: calc(50% - 10px);
        bottom: -5px;
        width: 20px;
        height: 10px;
      }
      &.selected table {
        box-shadow: 0 0 0 1px ${primaryBackground(config)};
        border-color: ${primaryBackground(config)};
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
    }
    .handle {
      position: absolute;
      left: -30px;
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
      margin-top: 10px;
      margin-bottom: 12px;
      display: flex;
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
        width: 100%;
        flex-grow: 1;
        flex-shrink: 2;
        min-width: 40%;
        padding: 10px;
        padding-left: 5px;
        font-family: '${font(config, true)}';
        font-variant-ligatures: none;
        border: 1px solid ${foreground(config)}4c;
        border-radius: 3px;
        .expand {
          position: absolute;
          height: 8px;
          width: 100%;
          bottom: -10px;
          left: 0;
          z-index: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          font-size: 10px;
          user-select: none;
          background: ${foreground(config)}22;
          border-radius: 3px;
          &:hover {
            background: ${foreground(config)}33;
          }
        }
        .lang-select {
          .lang-input {
            outline: none;
          }
        }
        .cm-editor {
          outline: none;
          .cm-content, .cm-gutter {
            padding: 0;
            font-family: '${font(config, true)}';
          }
          .cm-line {
            line-height: ${config.fontSize * 1.8}px;
          }
          .cm-lineWrapping {
            word-break: break-all;
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
          &:not(.cm-focused) {
            .cm-activeLine {
              background: none;
            }
          }
        }
        .cm-foldGutter {
          user-select: none;
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
      &.selected {
        box-shadow: 0 0 0 2px ${primaryBackground(config)};
        border-radius: 3px;
      }
      .mermaid {
        padding: 0 5px;
        background: ${foreground(config)}19;
        border: 1px solid ${foreground(config)}4c;
        box-shadow: -1px 0 0 ${foreground(config)}4c;
        border-left: 0;
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
        display: flex;
        width: 100%;
        line-height: 1 !important;
        flex-shrink: 1;
        flex-grow: 2;
        justify-content: center;
        align-items: center;
        user-select: none;
        svg {
          height: auto;
        }
        code {
          margin: 0;
          width: 100%;
          white-space: pre-line;
          align-self: flex-start;
          overflow: hidden;
          background: 0;
          border: 0;
        }
        .download {
          position: absolute;
          right: 8px;
          bottom: 8px;
          cursor: pointer;
          z-index: 10;
          user-select: none;
        }
      }
    }
    .task-list {
      margin: 10px 0;
      padding: 0;
      .task-list {
        margin: 0;
      }
    }
    .task-list-item {
      margin: 0;
      padding: 0;
    }
    .task-list-item {
      display: flex;
      align-items: baseline;
      input {
        margin-right: 8px;
      }
      &.checked > div > p {
        text-decoration: line-through;
        opacity: 0.6;
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
        pointer-events: none;
      }
      .resize-handle {
        position: absolute;
        width: 40px;
        height: 40px;
        bottom: -5px;
        right: -5px;
        cursor: nwse-resize;
      }
      &.ProseMirror-selectednode, &.selected {
        box-shadow: 0 0 0 2px ${primaryBackground(config)};
        border-radius: 3px;
      }
    }
    > *:not(.codemirror-outer)::selection,
    > *:not(.codemirror-outer) *::selection {
      background: ${selection(config)};
    }
  }
  .ProseMirror-yjs-cursor {
    position: relative;
    margin-left: -1px;
    margin-right: -1px;
    border-left: 1px solid black;
    border-right: 1px solid black;
    border-color: ${primaryBackground(config)};
    word-break: normal;
    pointer-events: none;
  }
`
