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
      top: 2px !important;
      right: 2px !important;
      position: absolute;
      background: none;
      display: flex;
      justify-content: flex-end;
      border: 0;
      button {
        padding: 2px;
        background: var(--primary-background);
        color: var(--primary-foreground);
        border: 0;
        border-radius: var(--border-radius);
        font-size: var(--menu-font-size);
        font-family: var(--menu-font-family);
        cursor: var(--cursor-pointer);
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
