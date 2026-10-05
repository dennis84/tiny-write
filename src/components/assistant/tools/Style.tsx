import {styled} from 'solid-styled-components'

const toolCallItem = `
  padding: 5px 0;
  font-size: var(--menu-font-size);
  color: var(--background-50);
  display: flex;
  cursor: var(--cursor-pointer);
  .icon {
    margin-right: 5px;
  }
`

export const ToolCallRow = styled.div`
  display: flex;
  flex-direction: column;
`

export const ToolCallTitle = styled.div`
  ${toolCallItem}
  &.blink {
    animation: blink 1s infinite ease-in-out;
  }
`

export const ToolCallLink = styled.a`
  ${toolCallItem}
  color: var(--primary-background);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &:hover {
    text-decoration: underline;
  }
`

export const ToolCallContent = styled.div`
  font-size: var(--menu-font-size);
  color: var(--background-50);
`
