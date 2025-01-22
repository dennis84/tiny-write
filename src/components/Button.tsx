import {styled} from 'solid-styled-components'

export const Common = `
  height: 40px;
  padding: 0 20px;
  border-radius: 30px;
  font-size: var(--menu-font-size);
  cursor: var(--cursor-pointer);
  display: inline-flex;
  justify-content: center;
  align-items: center;
  outline: none;
  text-decoration: none;
  font-family: var(--menu-font-family);
  border: 0;
  &[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .icon {
    margin-right: 5px;
  }
`

export const Button = styled('button')`
  ${Common}
  background: var(--background-60);
  color: var(--foreground);
  &:hover {
    color: var(--primary-background);
    background: var(--foreground-10);
  }
`

export const ButtonPrimary = styled('button')`
  ${Common}
  color: var(--primary-foreground);
  border: 0;
  background: var(--primary-background);
  &:hover {
    background: var(--primary-background-80);
  }
`

export const ButtonGroup = styled('div')`
  display: flex;
  flex-wrap: wrap;
  > button {
    margin-right: 10px;
    margin-bottom: 10px;
  }
`

export const IconButton = styled('button')`
  ${Common}
  width: 40px;
  padding: 0;
  background: none;
  color: var(--foreground);
  &:hover {
    background: var(--foreground-10);
    color: var(--primary-background);
  }
  .icon {
    margin: 0;
  }
`
