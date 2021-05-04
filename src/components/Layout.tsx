import styled from '@emotion/styled'
import {background, color, color2, font} from '../config'
import {rgb} from '../styles'

export const Layout = styled.div`
  position: relative;
  display: flex;
  background: ${(props) => rgb(background(props.theme))};
  width: 100%;
  height: 100%;
  font-family: ${(props) => font(props.theme)};
  font-size: 18px;
  color: ${(props) => rgb(color(props.theme))};
  .drop-cursor {
    background: ${(props) => rgb(color2(props.theme))} !important;
    height: 2px !important;
    opacity: 0.5;
  }
`
