import {styled} from 'solid-styled-components'
import {Config, Mode} from '@/state'

interface Props {
  config: Config;
  mode: Mode;
}

const codeBlock = (props: Props) => `
  .cm-container {
    position: relative;
    margin: 10px 0;
    margin-bottom: 15px;
    border-radius: var(--border-radius);
    display: flex;
    font-family: var(--font-family-monospace);
    font-variant-ligatures: none;
    .block-handle {
      top: 2px;
    }
    &.ProseMirror-selectednode,
    &.selected {
      box-shadow: 0 0 0 5px var(--selection-border);
    }
    .cm-editor {
      outline: none;
      .cm-content, .cm-gutter {
        padding: 0;
        font-family: var(--font-family-monospace);
      }
      .cm-line {
        line-height: calc(var(--font-size) * 1.6) !important;
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
        font-family: var(--font-family-monospace);
      }
    }
    > .cm-editor {
      height: 100%;
      width: 100%;
      border-radius: var(--border-radius);
      flex-direction: ${props.mode === Mode.Editor && props.config.contentWidth > 1000 ? 'row' : 'column'};
      > .cm-scroller {
        flex-grow: 1;
        flex-shrink: 1;
        padding: 30px;
        padding-left: 20px;
        width: 100%;
      }
      .lang-input {
        position: absolute;
        outline: none;
        margin-left: 15px;
        z-index: 1;
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
        line-height: 100%;
        cursor: var(--cursor-pointer);
        z-index: 10;
        user-select: none;
        img {
          width: 16px;
        }
      }
      .mermaid {
        padding: 30px;
        background: #ffffff11;
        display: flex;
        flex-grow: 2;
        flex-shrink: 1;
        min-width: 40%;
        max-width: 100%;
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
        cursor: var(--cursor-pointer);
        font-size: 10px;
        user-select: none;
        background: var(--foreground-10);
        border-radius: var(--border-radius);
        color: var(--foreground-60);
        &:hover {
          background: var(--foreground-20);
        }
      }
      @media print {
        .cm-scroller {
          max-height: 100% !important;
        }
        .expand,
        .lang-toggle {
          display: none !important;
        }
      }
    }
    &.hidden > .cm-editor > .cm-scroller {
      display: none !important;
    }
  }
`

const proseMirror = (props: Props) => `
  .ProseMirror {
    ${codeBlock(props)}
    cursor: var(--cursor-text);
    tab-size: 4;
    word-wrap: break-word;
    white-space: pre-wrap;
    position: relative;
    font-size: var(--font-size);
    font-family: var(--font-family);
    color: var(--foreground);
    line-height: calc(var(--font-size) * 1.6);
    outline: none !important;
    background: transparent;
    strong {
      font-family: var(--font-family-bold);
      font-weight: normal;
    }
    em {
      font-family: var(--font-family-italic);
      font-style: normal;
    }
    h1 {
      font-size: var(--font-size-h1);
      font-weight: 800;
      line-height: calc(var(--font-size-h1) * 1.6);
      .block-handle {
        height: calc(var(--font-size-h1) * 1.6);
      }
    }
    h2 {
      font-size: var(--font-size-h2);
    }
    h3 {
      font-size: var(--font-size-h3);
    }
    h4, h5, h6 {
      font-size: var(--font-size);
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
      border-left: 10px solid var(--foreground-20);
      padding-left: 10px;
      margin: 0;
    }
    code {
      border: 1px solid var(--foreground-50);
      background: var(--foreground-10);
      border-radius: var(--border-radius);
      font-family: var(--font-family-monospace) !important;
    }
    a, .edit-link {
      color: var(--primary-background);
    }
    .horizontal-rule {
      margin: 40px 0;
      height: 5px;
      line-height: 5px;
      background: var(--foreground-20);
      border-radius: var(--border-radius);
      page-break-before: always;
      .block-handle {
        top: -10px;
      }
      @media print {
        opacity: 0;
        margin: 0;
        height: 0;
      }
    }
    .table-container {
      table {
        width: 100%;
        margin: 5px 0;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: var(--border-radius);
        border: 1px solid var(--foreground-50);
        text-align: left;
        background: var(--foreground-10);
        th, td {
          padding: 10px 15px;
          vertical-align: top;
          border: 1px solid var(--foreground-50);
          border-top: 0;
          border-right: 0;
          position: relative;
        }
        th:first-child, td:first-child {
          border-left: 0;
        }
        th {
          background: var(--foreground-10);
          color: var(--foreground-80);
          font-family: var(--font-family-bold);
        }
        tr:last-child td {
          border-bottom: 0;
        }
      }
      .table-menu-button {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: var(--cursor-pointer);
        user-select: none;
        z-index: 1;
        background: var(--background);
        border: 1px solid var(--foreground-50);
        border-radius: var(--border-radius);
        svg {
          pointer-events: none;
          fill: var(--foreground-60);
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
        box-shadow: 0 0 0 5px var(--selection-border);
      }
    }
    .placeholder {
      color: var(--foreground-50);
      position: absolute;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none; // otherwise cannot type in empty editor
    }
    .draggable {
      position: relative;
    }
    .block-handle {
      position: absolute;
      left: -30px;
      top: 0;
      height: calc(var(--font-size) * 1.6);
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
        border-radius: var(--border-radius);
        padding: 6px;
        fill: var(--foreground-60);
        pointer-events: none;
        user-select: none;
      }
      &:hover > span {
        background: var(--foreground-10);
      }
      @media print {
        display: none;
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
      border-radius: var(--border-radius);
      &.ProseMirror-selectednode, &.selected {
        box-shadow: 0 0 0 5px var(--selection-border);
      }
    }
    .container-tip,
    .container-details {
      background: var(--foreground-10);
      > summary {
        cursor: var(--cursor-pointer);
      }
      &[open] > summary {
        margin-bottom: 10px;
      }
    }
    .container-warning {
      background: var(--primary-background-20);
    }
    .image-container {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      max-width: 100%;
      cursor: var(--cursor-default);
      line-height: 0;
      &.error {
        background: var(--foreground-10);
        border-radius: var(--border-radius);
        min-width: 40px;
        aspect-ratio: 1/1;
        img, video {
          display: none;
        }
      }
      img, video {
        width: 100%;
        border-radius: var(--border-radius);
      }
      .resize-handle {
        position: absolute;
        width: 40px;
        height: 40px;
        bottom: -5px;
        right: -5px;
        cursor: nwse-resize;
        touch-action: none;
      }
      &.float-left {
        float: left;
        margin-right: 10px;
      }
      &.float-right {
        float: right;
        margin-left: 10px;
        .resize-handle {
          left: -5px;
          right: auto;
          cursor: nesw-resize;
        }
      }
      &.center {
        margin: 10px auto;
      }
    }
    .image-container.ProseMirror-selectednode,
    .image-container.selected {
      box-shadow: 0 0 0 5px var(--selection-border);
      border-radius: var(--border-radius);
      img {
        border-radius: var(--border-radius);
      }
    }
    > .selected::selection,
    > .selected *::selection {
      background: none !important;
    }
    > *:not(.cm-container)::selection,
    > *:not(.cm-container) *::selection,
    > *:not(.cm-container).selected {
      background: var(--selection);
    }
    .ProseMirror-selectednode {
      background: var(--selection) !important;
      box-shadow: 0 0 0 5px var(--selection);
    }
    @media print {
      padding-bottom: 0;
    }
  }
`

export const CanvasEditor = styled('div')`
  width: 100%;
  min-height: 100%;
  height: fit-content;
  background: var(--background);
  padding: 10px 30px;
  ${(props: any) => proseMirror(props)}
`

export const FullEditor = styled('div')`
  min-height: calc(100% - 100px);
  height: fit-content;
  width: ${(props: any) => props.config.contentWidth}px;
  max-width: 100%;
  padding: 0 50px;
  ${(props: any) => proseMirror(props)}
  .ProseMirror {
    margin-top: 50px;
    padding-bottom: 77vh;
  }
`
