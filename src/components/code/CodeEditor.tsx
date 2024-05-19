import {createEffect, onCleanup} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {Scroll} from '../Layout'

export const CodeMirror = styled('div')`
  width: 100%;
  height: 100%;
  .cm-editor {
    outline: none;
    font-size: var(--font-size);
    cursor: var(--cursor-text);
    .cm-content, .cm-gutter {
      padding: 0;
      font-family: var(--font-family-monospace);
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
    flex-direction: row;
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
`

export const CodeEditor = () => {
  let containerRef!: HTMLDivElement

  const [, ctrl] = useState()

  createEffect(() => {
    const currentFile = ctrl.file.currentFile
    if (currentFile && currentFile?.codeEditorView === undefined) {
      ctrl.code.renderEditor(currentFile.id, containerRef)
    }
  })

  onCleanup(() => {
    ctrl.file.destroy(ctrl.file.currentFile?.id)
  })

  return (
    <Scroll>
      <CodeMirror ref={containerRef} />
    </Scroll>
  )
}
