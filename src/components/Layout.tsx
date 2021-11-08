import styled from '@emotion/styled'
import {background, color, color2, font} from '../config'

export const Layout = styled.div`
  position: relative;
  display: flex;
  background: ${(props) => background(props.theme)};
  width: 100%;
  height: 100%;
  font-family: ${(props) => font(props.theme)};
  font-size: 18px;
  color: ${(props) => color(props.theme)};
  .drop-cursor {
    background: ${(props) => color2(props.theme)} !important;
    height: 2px !important;
    opacity: 0.5;
  }
`
