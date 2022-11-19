import {splitProps} from 'solid-js'
import {css} from '@emotion/css'
import {background, foreground, primaryBackground, font, selection} from '@/config'
import {Styled} from './Layout'

export default (props: Styled & {markdown: boolean}) => {
  const [local, others] = splitProps(props, ['config', 'markdown'])

  return (
    <div {...others} class={css`
      min-height: calc(100% - 100px);
      height: fit-content;
      width: ${local.config.contentWidth}px;
      max-width: 100%;
      padding: 0 50px;
      .ProseMirror {
        ${local.markdown ? 'white-space: pre-wrap' : ''};
        word-wrap: break-word;
        white-space: pre-wrap;
        position: relative;
        font-size: ${local.config.fontSize}px;
        font-family: ${font(local.config)};
        color: ${foreground(local.config)};
        margin-top: 50px;
        padding-bottom: 77vh;
        line-height: ${local.config.fontSize * 1.6}px;
        outline: none !important;
        background: transparent;
        strong {
          font-family: ${font(local.config, {bold: true})};
        }
        em {
          font-family: ${font(local.config, {italic: true})};
        }
        h1, h2, h3, h4, h5, h6 {
          line-height: ${local.config.fontSize * 1.6}px;
        }
        h1 {
          font-size: ${local.config.fontSize * 1.8}px;
          line-height: ${local.config.fontSize * 2.3}px;
        }
        h2 {
          font-size: ${local.config.fontSize * 1.4}px;
        }
        h3 {
          font-size: ${local.config.fontSize * 1.2}px;
        }
        h4, h5, h6 {
          font-size: ${local.config.fontSize}px;
        }
        p.truncate {
          overflow: hidden;
          max-width: 75ch;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        p {
          margin: 10px 0;
          display: flow-root;
        }
        > ul, ol {
          padding: 0;
        }
        > ul > li, > ol > li {
          margin-left: 30px;
        }
        blockquote {
          border-left: 10px solid ${foreground(local.config)}33;
          padding-left: 10px;
          margin: 0;
        }
        code {
          border: 1px solid ${foreground(local.config)}7f;
          background: ${foreground(local.config)}19;
          border-radius: 3px;
          padding: 1px;
          font-family: '${font(local.config, {monospace: true})}' !important;
        }
        a {
          color: ${primaryBackground(local.config)};
        }
        .table-container {
          table {
            width: 100%;
            margin: 5px 0;
            border-collapse: separate;
            border-spacing: 0;
            border-radius: 3px;
            border: 1px solid ${foreground(local.config)}7f;
            text-align: left;
            background: ${foreground(local.config)}19;
            th, td {
              padding: 10px 15px;
              vertical-align: top;
              border: 1px solid ${foreground(local.config)}7f;
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
            background: ${background(local.config)};
            border: 1px solid ${foreground(local.config)}7f;
            border-radius: 3px;
          }
          .table-menu-right {
            top: calc(50% - 10px);
            right: -5px;
            width: 9px;
            height: 20px;
          }
          .table-menu-left {
            top: calc(50% - 10px);
            left: -5px;
            width: 9px;
            height: 20px;
          }
          .table-menu-bottom {
            left: calc(50% - 10px);
            bottom: -5px;
            width: 20px;
            height: 9px;
          }
          &.selected table {
            box-shadow: 0 0 0 1px ${primaryBackground(local.config)};
            border-color: ${primaryBackground(local.config)};
          }
        }
        .placeholder {
          color: ${foreground(local.config)}4c;
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
          height: ${local.config.fontSize * 1.6}px;
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
            fill: ${foreground(local.config)}99;
            pointer-events: none;
            user-select: none;
          }
          &:hover > span {
            background: ${foreground(local.config)}19;
          }
        }
        h1 .handle {
          height: ${local.config.fontSize * 2.3}px;
        }
        .draggable:hover .handle {
          opacity: 1;
        }
        .codemirror-outer {
          position: relative;
          margin: 10px 0;
          margin-bottom: 15px;
          border-radius: 3px;
          display: flex;
          .handle {
            top: 2px;
          }
          .lang-toggle {
            position: absolute;
            right: -5px;
            height: ${local.config.fontSize * 1.6}px;
            display: flex;
            align-items: center;
            transform: translateX(100%);
            cursor: pointer;
            z-index: 10;
            user-select: none;
          }
          .codemirror-inner {
            position: relative;
            width: 100%;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            flex-shrink: 2;
            min-width: 40%;
            font-family: '${font(local.config, {monospace: true})}';
            font-variant-ligatures: none;
            border: 1px solid ${foreground(local.config)}4c;
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
              background: ${foreground(local.config)}22;
              border-radius: 3px;
              &:hover {
                background: ${foreground(local.config)}33;
              }
            }
            .lang-input {
              outline: none;
              .cm-editor {
                width: 100%;
                padding: 5px;
                display: flex;
                flex-direction: row;
                &::before {
                  content: "\`\`\`";
                }
                .cm-line {
                  padding: 0;
                }
              }
            }
            .cm-editor {
              outline: none;
              .cm-content, .cm-gutter {
                padding: 0;
                font-family: '${font(local.config, {monospace: true})}';
              }
              .cm-line {
                line-height: ${local.config.fontSize * 1.8}px;
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
              .cm-tooltip ul {
                font-family: '${font(local.config, {monospace: true})}';
              }
              &:not(.cm-focused) {
                .cm-activeLine {
                  background: none;
                }
              }
            }
            > .cm-editor {
              height: 100%;
              .cm-scroller {
                padding: 20px;
                padding-left: 10px;
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
            box-shadow: 0 0 0 2px ${primaryBackground(local.config)};
            border-radius: 3px;
          }
          .mermaid {
            padding: 0 5px;
            background: ${foreground(local.config)}19;
            border: 1px solid ${foreground(local.config)}4c;
            box-shadow: -1px 0 0 ${foreground(local.config)}4c;
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
          display: flex;
          align-items: baseline;
          p {
            margin: 0;
          }
          input {
            margin-right: 8px;
          }
          &.checked > div > p {
            text-decoration: line-through;
            opacity: 0.6;
          }
        }
        .container-tip, .container-warning, .container-details {
          padding: 30px;
          border-radius: 3px;
          &.selected {
            box-shadow: 0 0 0 2px ${primaryBackground(local.config)};
          }
        }
        .container-tip {
          background: ${foreground(local.config)}19;
        }
        .container-details {
          background: ${foreground(local.config)}19;
          > summary {
            cursor: pointer;
          }
          &[open] > summary {
            margin-bottom: 10px;
          }
        }
        .container-warning {
          background: ${primaryBackground(local.config)}33;
        }
        .image-container {
          position: relative;
          float: left;
          max-width: 100%;
          margin-right: 10px;
          cursor: default;
          line-height: 0;
          img, video {
            width: 100%;
            border-radius: 3px;
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
            box-shadow: 0 0 0 2px ${primaryBackground(local.config)};
            border-radius: 3px;
            img {
              border-radius: 3px;
            }
          }
        }
        > *:not(.codemirror-outer)::selection,
        > *:not(.codemirror-outer) *::selection {
          background: ${selection(local.config)};
        }
      }
    `} />
  )
}
