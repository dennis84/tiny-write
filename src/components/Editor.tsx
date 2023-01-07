import {splitProps} from 'solid-js'
import {css} from '@emotion/css'
import {background, foreground, primaryBackground, font, selection} from '@/config'
import {Styled} from './Layout'

export default (props: Styled & {markdown: boolean}) => {
  const [local, others] = splitProps(props, ['config', 'markdown'])

  const codeBlock = () => css`
    .cm-container {
      position: relative;
      margin: 10px 0;
      margin-bottom: 15px;
      border-radius: 3px;
      display: flex;
      font-family: '${font(local.config, {monospace: true})}';
      font-variant-ligatures: none;
      .block-handle {
        top: 2px;
      }
      .cm-tooltip-autocomplete {
        border-radius: 3px;
        border: 0;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        ul {
          max-height: 300px;
          li {
            padding: 10px;
          }
        }
      }
      &.ProseMirror-selectednode,
      &.selected {
        box-shadow: 0 0 0 5px ${primaryBackground(local.config)}44;
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
        .cm-foldGutter {
          user-select: none;
        }
        &:not(.cm-focused) {
          .cm-activeLine {
            background: none;
          }
        }
        .cm-tooltip ul {
          font-family: '${font(local.config, {monospace: true})}';
        }
      }
      > .cm-editor {
        height: 100%;
        width: 100%;
        border-radius: 3px;
        flex-direction: ${local.config.contentWidth > 600 ? 'row' : 'column'};
        &.selected {
          box-shadow: 0 0 0 2px ${primaryBackground(local.config)};
          border-radius: 3px;
        }
        > .cm-scroller {
          flex-grow: 1;
          flex-shrink: 1;
          padding: 30px;
          padding-left: 20px;
        }
        .lang-input {
          position: absolute;
          outline: none;
          margin-left: 15px;
          .cm-editor {
            width: 100%;
            padding: 5px;
            flex-direction: row;
            &::before {
              content: "\`\`\`";
            }
            .cm-line {
              padding: 0;
            }
          }
        }
        .lang-toggle {
          position: absolute;
          box-sizing: border-box;
          top: 0;
          right: 0;
          margin: 4px;
          height: 16px;
          font-size: 12px;
          line-height: 100%;
          cursor: pointer;
          z-index: 10;
          user-select: none;
          img {
            width: 16px;
          }
        }
        .mermaid {
          padding: 30px;
          background: #00000022;
          display: flex;
          flex-grow: 2;
          flex-shrink: 1;
          line-height: 1 !important;
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
        .expand {
          position: absolute;
          height: 8px;
          width: 100%;
          bottom: -9px;
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
  `

  return (
    <div {...others} class={css`
      min-height: calc(100% - 100px);
      height: fit-content;
      width: ${local.config.contentWidth}px;
      max-width: 100%;
      padding: 0 50px;
      .ProseMirror {
        ${codeBlock()}
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
        hr {
          margin: 40px 0;
          border: 0;
          border-bottom: 5px dashed ${foreground(local.config)}33;
          page-break-after: always;
          @media print {
            opacity: 0;
          }
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
              background: ${foreground(local.config)}19;
              color: ${foreground(local.config)}cc;
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
            svg {
              pointer-events: none;
              fill: ${foreground(local.config)}99;
              height: 10px;
            }
          }
          .table-menu-right {
            top: calc(50% - 8px);
            right: -8.5px;
            width: 16px;
            height: 16px;
          }
          .table-menu-left {
            top: calc(50% - 8px);
            left: -8.5px;
            width: 16px;
            height: 16px;
          }
          .table-menu-bottom {
            left: calc(50% - 8px);
            bottom: -8.5px;
            width: 16px;
            height: 16px;
            svg {
              transform: rotate(90deg);
            }
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
        .block-handle {
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
        .draggable:hover .block-handle,
        .ProseMirror-selectednode .block-handle {
          opacity: 1;
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
          &.ProseMirror-selectednode, &.selected {
            box-shadow: 0 0 0 5px ${primaryBackground(local.config)}44;
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
        }
        .ProseMirror-selectednode .image-container,
        .image-container.ProseMirror-selectednode,
        .image-container.selected {
          box-shadow: 0 0 0 5px ${primaryBackground(local.config)}44;
          border-radius: 3px;
          img {
            border-radius: 3px;
          }
        }
        > *:not(.cm-container)::selection,
        > *:not(.cm-container) *::selection,
        > *:not(.cm-container).selected {
          background: ${selection(local.config)};
        }
        .ProseMirror-selectednode {
          background: ${selection(local.config)} !important;
          box-shadow: 0 0 0 5px ${selection(local.config)};
        }
      }
    `} />
  )
}
