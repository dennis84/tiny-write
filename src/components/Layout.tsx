import styled from '@emotion/styled'
import {css} from '@emotion/react'
import {background, foreground, primary, font} from '../config'
import {Config} from '..'

export const CommonLayout = (props: {theme: Config}) => css`
  display: flex;
  background: ${background(props.theme)};
  width: 100%;
  height: 100%;
  font-family: ${font(props.theme)};
  font-size: 18px;
  color: ${foreground(props.theme)};
`

export const Layout = styled.div`
  ${CommonLayout}
  position: relative;
  .drop-cursor {
    background: ${props => primary(props.theme)} !important;
    height: 2px !important;
    opacity: 0.5;
  }
`

export const ErrorLayout = styled.div`
  ${CommonLayout}
  position: absolute;
  z-index: 20;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
`
