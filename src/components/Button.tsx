import {css} from '@emotion/react'
import styled from '@emotion/styled'
import {color, color2, font} from '../config'
import {rgb} from '../styles'

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
  -webkit-app-region: no-drag;
  &:hover {
    opacity: 0.8;
  }
`

export const Button = styled.button`
  ${Common}
  background: none;
  font-family: ${props => font(props.theme)};
  color: ${props => rgb(color(props.theme))};
  border: 1px solid ${props => rgb(color(props.theme))};
`

export const ButtonPrimary = styled.button`
  ${Common}
  color: #fff;
  border: 0;
  font-family: ${props => font(props.theme)};
  background: ${props => rgb(color2(props.theme))};
`
