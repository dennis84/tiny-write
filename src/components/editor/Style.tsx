import {styled} from 'solid-styled-components'
import {codeMirror} from '../code/Style'

export const codeBlock = `
  .cm-container {
    position: relative;
    margin: 10px 0;
    margin-bottom: 15px;
    border-radius: var(--border-radius);
    display: flex;
    font-family: var(--font-family-monospace);
    font-variant-ligatures: none;
    &.ProseMirror-selectednode,
    &.selected {
      box-shadow: 0 0 0 5px var(--selection-border);
    }
    ${codeMirror}
    container-type: inline-size;
    .cm-editor {
      flex-direction: column;
      /* place code editor and mermaid diagram side by side on wide screens */
      @container (width > 1000px) {
        flex-direction: row;
      }
      .cm-scroller {
        padding: 20px 7px;
      }
      .cm-line {
        line-height: var(--line-height) !important;
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
    }
    &.hidden > .cm-editor > .cm-scroller {
      display: none !important;
    }
  }
`

export const standardMarkdown = `
  strong {
    font-family: var(--font-family-bold);
    font-weight: normal;
  }
  em {
    font-family: var(--font-family-italic);
    font-style: normal;
  }
  h1, h2, h3, h4, h5, h6 {
    margin: 20px 0;
  }
  h1 {
    font-size: var(--font-size-h1);
    font-weight: 800;
    line-height: var(--line-height-h1);
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
    padding: 2px 5px;
  }
  a, .edit-link {
    color: var(--primary-background);
  }
  hr, .horizontal-rule {
    border: 0;
    margin: 40px 0;
    height: 5px;
    line-height: 5px;
    background: var(--foreground-20);
    border-radius: var(--border-radius);
    page-break-before: always;
    @media print {
      opacity: 0;
      margin: 0;
      height: 0;
    }
  }
  table {
    width: 100%;
    margin: 5px 0;
    border-collapse: separate;
    border-spacing: 0;
    border-radius: var(--border-radius);
    border: 1px solid var(--foreground-20);
    text-align: left;
    overflow: hidden; /* clip the th background */
    th, td {
      padding: 10px 15px;
      vertical-align: top;
      border: 1px solid var(--foreground-20);
      border-top: 0;
      border-right: 0;
      position: relative;
    }
    th:first-child, td:first-child {
      border-left: 0;
    }
    th {
      background: var(--foreground-5);
      color: var(--foreground-80);
      font-family: var(--font-family-bold);
    }
    tr:last-child td {
      border-bottom: 0;
    }
    &.selected {
      box-shadow: 0 0 0 5px var(--selection-border);
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
`

const proseMirror = `
  .ProseMirror {
    ${codeBlock}
    cursor: var(--cursor-text);
    tab-size: 4;
    word-wrap: break-word;
    white-space: pre-wrap;
    position: relative;
    font-size: var(--font-size);
    font-family: var(--font-family);
    color: var(--foreground);
    line-height: var(--line-height);
    outline: none !important;
    background: transparent;
    ${standardMarkdown}
    a, .edit-link {
      color: var(--primary-background);
      pointer-events: none;
    }
    p.truncate {
      overflow: hidden;
      max-width: 75ch;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .placeholder {
      color: var(--foreground-50);
      position: absolute;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none; /* otherwise cannot type in empty editor */
    }
    .draggable {
      position: relative;
    }
    .container-tip, .container-warning, .container-details {
      padding: 20px;
      border-radius: var(--border-radius);
      &.ProseMirror-selectednode, &.selected {
        box-shadow: 0 0 0 5px var(--selection-border);
      }
      > *:first-child {
        margin-top: 0;
      }
      > *:last-child {
        margin-bottom: 0;
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
    ::selection {
      background: var(--selection);
    }
    .ProseMirror-selectednode {
      background: var(--selection) !important;
      box-shadow: 0 0 0 5px var(--selection);
      &::selection, ::selection {
        background: none;
      }
    }
    @media print {
      padding-bottom: 0;
    }

    /* Blinking node during AI processing */
    @keyframes blink {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    .blink {
      animation: blink 1s infinite ease-in-out;
    }
  }
`

export const CanvasEditor = styled('div')`
  width: 100%;
  min-height: 100%;
  height: fit-content;
  background: var(--background);
  padding: 30px 40px;
  ${proseMirror}
`

export const FullEditor = styled('div')`
  min-height: calc(100% - 100px);
  height: fit-content;
  width: var(--content-width);
  max-width: 100%;
  padding: 0 50px; /* leave space for handles if width is 100% */
  ${proseMirror}
  .ProseMirror {
    margin-top: 50px;
    padding-bottom: 77vh;
  }
`

export const ChatInputEditor = styled('div')`
  width: 100%;
  height: fit-content;
  max-height: 50vh;
  overflow-y: auto;
  ${proseMirror}
  &::-webkit-scrollbar {
    display: none;
  }
  .ProseMirror {
    .cm-container {
      background: var(--background-20);
    }
  }
`
