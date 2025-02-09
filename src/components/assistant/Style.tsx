import {styled} from 'solid-styled-components'

export const chatBubble = `
  position: relative;
  border-radius: var(--border-radius);
  font-size: var(--menu-font-size);
  .cm-editor {
    font-size: var(--menu-font-size);
    font-family: var(--menu-font-family);
    border-radius: var(--border-radius);
    position: relative;
    .cm-content {
      padding: 10px;
    }
    .cm-panels {
      position: static;
      background: none;
      border: 0;
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

export const inputEditor = `
  .cm-editor {
    border: 1px solid var(--primary-background);
    border-radius: var(--border-radius);
    padding: 10px;
    padding-bottom: 50px;
    cursor: var(--cursor-text);
    font-size: var(--menu-font-size);
    font-family: var(--menu-font-family);
    outline: none;
    &.cm-focused {
      box-shadow: 0 0 0 2px var(--primary-background);
    }
  }
`

export const ChatInputAction = styled('div')`
  position: absolute;
  right: 0;
  bottom: 0;
  height: 50px;
  align-items: center;
  display: inline-flex;
  padding: 5px;
`
