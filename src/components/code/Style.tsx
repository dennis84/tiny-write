export const codeMirror = `
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
    @media print {
      .cm-scroller {
        max-height: 100% !important;
      }
    }
  }
`
