import {styled} from 'solid-styled-components'
import {isClipped} from '../code/Style'
import {standardMarkdown} from '../editor/Style'

export const chatBubble = `
  position: relative;
  border-radius: var(--border-radius);
  font-size: var(--font-size);
  line-height: var(--line-height);
  ${standardMarkdown}
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
  padding-bottom: 20px;
  margin-top: auto; /* align to bottom */
`

// biome-ignore format: ternary breaks ugly
export const ChatInputBorder = styled("div")`
  scroll-margin-bottom: 50px;
  border: 1px solid var(--primary-background);
  border-radius: var(--border-radius);
  padding: 10px 20px;
  font-size: var(--menu-font-size);
  font-family: var(--menu-font-family);
  ${(props: any) => props.focused ? `
    box-shadow: 0 0 0 2px var(--primary-background);
  ` : ''}
`

export const ChatInputEditorRow = styled('div')`
  display: flex;
`

export const ChatInputAction = styled('div')`
  height: 40px;
  display: flex;
  margin-top: auto;
  align-items: flex-end;
`
