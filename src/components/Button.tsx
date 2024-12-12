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
  &:hover {
    opacity: 0.8;
  }
  &[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const Button = styled('button')`
  ${Common}
  background: var(--background-60);
  color: var(--foreground);
  &:hover {
    color: var(--primary-background);
  }
`

export const ButtonPrimary = styled('button')`
  ${Common}
  color: var(--primary-foreground);
  border: 0;
  background: var(--primary-background);
`

export const ButtonGroup = styled('div')`
  display: flex;
  flex-wrap: wrap;
  > button {
    margin-right: 10px;
    margin-bottom: 10px;
  }
`
