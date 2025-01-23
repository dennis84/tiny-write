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
      position: static;
      border-bottom: 1px solid #00000066;
      border-top-left-radius: var(--border-radius);
      border-top-right-radius: var(--border-radius);
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
