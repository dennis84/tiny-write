import {css} from '@emotion/css'
import {Styled} from './Layout'

export const Common = css`
  height: 50px;
  padding: 0 20px;
  border-radius: 30px;
  font-size: var(--menu-font-size);
  cursor: pointer;
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

export const button = () => css`
  ${Common}
  background: none;
  font-family: var(--menu-font-family);
  color: var(--foreground);
  border: 1px solid var(--foreground);
  &:hover {
    border-color: var(--primary-background);
    color: var(--primary-background);
    box-shadow: 0 0 0 1px var(--primary-background);
  }
`

export const buttonPrimary = () => css`
  ${Common}
  color: var(--primary-foreground);
  border: 0;
  background: var(--primary-background);
`

export const ButtonGroup = (props: Styled) => (
  <div class={css`
    > button {
      margin-right: 10px;
      margin-bottom: 10px;
    }
  `}>{props.children}</div>
)
