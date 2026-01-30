import {styled} from 'solid-styled-components'
import {isClipped} from '../code/Style'
import {standardMarkdown} from '../editor/Style'

export const ChatBubble = styled('div')`
  position: relative;
  border-radius: var(--border-radius);
  font-size: var(--font-size);
  line-height: var(--line-height);
  ${standardMarkdown}
  .cm-editor {
    ${isClipped}
    outline: none;
    margin: 10px 0;
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
      padding: 10px;
      padding-top: 0; /* no magin to apply panel */
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
  a {
    color: var(--primary-background);
  }
`

export const ChatInputContainer = styled('div')`
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  margin: 0 auto;
  max-width: var(--content-width);
  z-index: var(--z-index-above-content);
`

// biome-ignore format: ternary breaks ugly
export const ChatInputBorder = styled('div')<{focused: boolean}>`
  background: var(--background);
  scroll-margin-bottom: 50px;
  border: 1px solid var(--primary-background);
  border-radius: var(--border-radius);
  padding: 10px;
  font-size: var(--menu-font-size);
  font-family: var(--menu-font-family);
  ${(p) => p.focused ? `
    box-shadow: 0 0 0 2px var(--primary-background);
  ` : ''}
`

export const ChatInputEditorRow = styled('div')`
  display: flex;
`

export const ChatInputActionRow = styled('div')`
  display: flex;
  justify-content: flex-end;
`
