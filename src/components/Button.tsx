import {css} from '@emotion/core'
import styled from '@emotion/styled'

export const Common = css`
  height: 50px;
  padding: 0 20px;
  background: #f9f9f9;
  color: #4a4a4a;
  border-radius: 30px;
  border: 1px solid #ccc;
  font-size: 18px;
  font-family: 'Roboto';
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
`

export const ButtonPrimary = styled.button`
  ${Common}
  background: #8575ff;
  color: #fff;
  border: 0;
`
