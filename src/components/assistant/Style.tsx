export const chatBubble = `
  position: relative;
  flex-basis: 100%;
  margin-bottom: 20px;
  border-radius: var(--border-radius);
  font-size: var(--menu-font-size);
  .cm-editor {
    font-size: var(--menu-font-size);
    font-family: var(--menu-font-family);
    border-radius: var(--border-radius);
    position: relative;
    .cm-panels {
      border-bottom: 1px solid #00000066;
      border-top-left-radius: var(--border-radius);
      border-top-right-radius: var(--border-radius);
      .copilot-panel {
        padding: 2px;
        padding-left: 5px;
        border-top-left-radius: var(--border-radius);
        border-top-right-radius: var(--border-radius);
        width: 100%;
        display: grid;
        grid-template-columns: minmax(0, 1fr) min-content min-content;
        align-items: center;
        font-size: 12px;
        span {}
        button {
          padding: 2px;
          margin-left: 5px;
          background: var(--foreground-10);
          color: var(--foreground);
          border: 0;
          border-radius: var(--border-radius);
          font-family: var(--menu-font-family);
          cursor: var(--cursor-pointer);
          &:hover {
            background: var(--foreground-20);
          }
        }
      }
    }
  }
  .cm-gap {
    display: none;
  }
  pre:not(.cm-rendered) {
    background: var(--foreground-10);
    border-radius: var(--border-radius);
    padding: 5px;
  }
  a {
    color: var(--primary-background);
  }
`
