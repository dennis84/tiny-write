import {styled} from 'solid-styled-components'

export const ToolCallRow = styled.div`
  padding: 5px;
  display: flex;
  flex-direction: column;
`

export const ToolCallTitle = styled.div`
  font-size: var(--menu-font-size);
  color: var(--background-50);
  display: flex;
  .icon {
    margin-right: 5px;
  }
`

export const ToolCallResultList = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 5px;
  gap: 2px;
`

export const ToolCallResultItem = styled.a`
  font-size: var(--menu-font-size);
  color: var(--primary-background);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &:hover {
    text-decoration: underline;
  }
`
