import {styled} from 'solid-styled-components'

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

export const ChatInputContainer = styled('div')`
  position: relative;
  .cm-editor {
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    padding: 10px;
    padding-bottom: 50px;
    cursor: var(--cursor-text);
    font-size: var(--menu-font-size);
    font-family: var(--menu-font-family);
    outline: none;
    &.cm-focused {
      border-color: var(--primary-background);
      box-shadow: 0 0 0 1px var(--primary-background);
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
