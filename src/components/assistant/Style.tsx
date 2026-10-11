import {styled} from 'solid-styled-components'
import {isClipped} from '../code/Style'
import {standardMarkdown} from '../editor/Style'

// biome-ignore format: ternary breaks ugly
export const ChatBubble = styled.div<{fadeIn?: boolean}>`
  position: relative;
  border-radius: var(--border-radius);
  font-size: var(--font-size);
  line-height: var(--line-height);
  ${standardMarkdown}
  ${(p) => p.fadeIn !== undefined ? `
    > * {
      opacity: ${p.fadeIn ? '0' : '1'};
      animation: fadeIn 1.2s 0.1s ease-out forwards;
    }` : ``}
  .cm-editor {
    ${isClipped}
    &.is-clipped {
      max-height: 400px;
    }
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
  a {
    color: var(--primary-background);
  }
`

export const ChatInputContainer = styled.div`
  position: absolute;
  bottom: 10px;
  left: 20px;
  right: 20px;
  margin: 0 auto;
  max-width: var(--content-width);
  z-index: var(--z-index-above-content);
`

// biome-ignore format: ternary breaks ugly
export const ChatInputBorder = styled.div<{focused: boolean}>`
  width: 100%;
  background: var(--background);
  box-shadow: 0 12px 32px 0 rgba(0, 0, 0, 0.24);
  scroll-margin-bottom: 50px;
  border: 1px solid var(--primary-background);
  border-radius: var(--border-radius);
  padding: 10px;
  font-size: var(--menu-font-size);
  font-family: var(--menu-font-family);
  ${(p) => p.focused ? `
    box-shadow: 0 12px 32px 0 rgba(0, 0, 0, 0.24), 0 0 0 2px var(--primary-background);
  ` : ''}
`

export const ChatInputEditorRow = styled.div`
  display: flex;
`

export const ChatInputActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 10px;
`
