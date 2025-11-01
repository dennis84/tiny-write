import {styled} from 'solid-styled-components'
import {isClipped} from '../code/Style'

export const chatBubble = `
  position: relative;
  border-radius: var(--border-radius);
  font-size: var(--font-size);
  line-height: var(--line-height);
  .cm-editor {
    ${isClipped}
    font-size: var(--menu-font-size);
    font-family: var(--menu-font-family);
    border-radius: var(--border-radius);
    position: relative;
    .cm-scroller {
      &::-webkit-scrollbar {
        display: none;
      }
    }
    .cm-content {
      padding: 12px;
    }
    .cm-panels {
      position: static;
      background: none;
      border: 0;
    }
  }
  .fence-container {
    margin-bottom: 10px;
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

// biome-ignore format: ternary breaks ugly
export const ChatInputContainer = styled('div')`
  margin-top: 20px;
  scroll-margin-bottom: 50px;
  border: 1px solid var(--primary-background);
  border-radius: var(--border-radius);
  padding: 10px;
  background: var(--code-background);
  font-size: var(--menu-font-size);
  font-family: var(--menu-font-family);
  ${(props: any) => props.focused ? `
    box-shadow: 0 0 0 2px var(--primary-background);
  ` : ''}
`

export const ChatInputFieldContainer = styled('div')`
  display: flex;
`

export const ChatInputEditor = styled('div')`
  width: 100%;
  display: flex;
  align-items: center;
  .cm-editor {
    width: 100%;
    line-height: 40px;
    cursor: var(--cursor-text);
    outline: none;
    border-radius: var(--border-radius);
    .cm-scroller {
      -ms-overflow-style: none;
      scrollbar-width: none;
      &::-webkit-scrollbar {
        display: none;
      }
    }
  }
`

export const ChatInputAction = styled('div')`
  height: 40px;
  display: flex;
  margin-top: auto;
  align-items: flex-end;
`
