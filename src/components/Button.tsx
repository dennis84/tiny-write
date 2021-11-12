import {css} from '@emotion/react'
import styled from '@emotion/styled'
import {color, color2, font} from '../config'

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
  &:hover {
    opacity: 0.8;
  }
`

export const Button = styled.button`
  ${Common}
  background: none;
  font-family: ${props => font(props.theme)};
  color: ${props => color(props.theme)};
  border: 1px solid ${props => color(props.theme)};
`

export const ButtonPrimary = styled.button`
  ${Common}
  color: #fff;
  border: 0;
  font-family: ${props => font(props.theme)};
  background: ${props => color2(props.theme)};
`
