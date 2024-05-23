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
  &:hover {
    opacity: 0.8;
  }
`

export const Button = styled('button')`
  ${Common}
  background: none;
  color: var(--foreground);
  border: 1px solid var(--foreground);
  &:hover {
    border-color: var(--primary-background);
    color: var(--primary-background);
    box-shadow: 0 0 0 1px var(--primary-background);
  }
`

export const ButtonPrimary = styled('button')`
  ${Common}
  color: var(--primary-foreground);
  border: 0;
  background: var(--primary-background);
`

export const ButtonGroup = styled('div')`
  > button {
    margin-right: 10px;
    margin-bottom: 10px;
  }
`
