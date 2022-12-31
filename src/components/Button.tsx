import {css} from '@emotion/css'
import {foreground, primaryBackground, primaryForeground} from '@/config'
import {Config} from '@/state'

export const Common = css`
  height: 50px;
  padding: 0 20px;
  border-radius: 30px;
  font-size: 18px;
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  outline: none;
  text-decoration: none;
  font-family: 'iA Writer Mono';
  &:hover {
    opacity: 0.8;
  }
`

export const button = (config: Config) => css`
  ${Common}
  background: none;
  font-family: 'iA Writer Mono';
  color: ${foreground(config)};
  border: 1px solid ${foreground(config)};
  &:hover {
    border-color: ${primaryBackground(config)};
    color: ${primaryBackground(config)};
    box-shadow: 0 0 0 1px ${primaryBackground(config)};
  }
`

export const buttonPrimary = (config: Config) => css`
  ${Common}
  color: ${primaryForeground(config)};
  border: 0;
  background: ${primaryBackground(config)};
`
