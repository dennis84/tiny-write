import styled from '@emotion/styled'
import {background, color, color2, font, rgba} from '../config'

export const Layout = styled.div`
  position: relative;
  display: flex;
  background: ${(props) => rgba(background(props.theme))};
  width: 100%;
  height: 100%;
  font-family: ${(props) => font(props.theme)};
  font-size: 18px;
  color: ${(props) => rgba(color(props.theme))};
  .drop-cursor {
    background: ${(props) => rgba(color2(props.theme))} !important;
    height: 2px !important;
    opacity: 0.5;
  }
`

export const Resizer = styled.div`
  width: 100%;
  height: 20px;
  position: fixed;
  background: transparent;
  bottom: 0;
  right: 0;
  z-index: 1;
  user-select: none;
  pointer-events: none;
  -webkit-app-region: no-drag;
`
