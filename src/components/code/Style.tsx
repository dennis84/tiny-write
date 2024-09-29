export const codeMirror = `
  .cm-editor {
    outline: none;
    font-size: var(--font-size);
    cursor: var(--cursor-text);
    height: 100%;
    width: 100%;
    border-radius: var(--border-radius);
    flex-direction: row;
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
      flex-grow: 1;
      flex-shrink: 1;
      width: 100%;
      line-height: 1.5;
      -ms-overflow-style: none;
      scrollbar-width: none;
      &::-webkit-scrollbar {
        display: none;
      }
    }
    .cm-foldGutter {
      user-select: none;
    }
    .cm-lineNumbers {
      opacity: 0.5;
      margin-right: 10px;
    }
    &:not(.cm-focused) {
      .cm-activeLine {
        background: none;
      }
    }
    .cm-tooltip ul {
      font-family: var(--font-family-monospace);
    }
    @media print {
      .cm-scroller {
        max-height: 100% !important;
      }
    }
  }
`

export const codeMirrorTooltip = `
  .cm-tooltip-autocomplete {
    background: var(--tooltip-background);
    border-radius: var(--border-radius) !important;
    border: 0 !important;
    box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.24);
    padding: 6px 8px;
    font-family: var(--menu-font-family);
    font-size: var(--menu-font-size);
    line-height: 1.4;
    ul {
      max-height: 300px !important;
      li {
        padding: 6px 8px !important;
        margin: 2px 0;
        min-height: 32px;
        cursor: var(--cursor-pointer);
        border-radius: var(--border-radius);
        &:hover, &.selected {
          background: var(--primary-background);
          color: var(--primary-foreground);
        }
        .cm-completionIcon {
          margin-right: 10px;
        }
      }
    }
  }
`
