import type {JSX} from 'solid-js'
import {styled} from 'solid-styled-components'

interface IconProps {
  flip?: 'horzontal' | 'vertical'
}

const SvgIconEl = styled.span<IconProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  svg {
    ${(p) =>
      p.flip === 'horzontal'
        ? `transform: scale(-1, 1);`
        : p.flip === 'vertical'
          ? 'transform: scale(1, -1);'
          : ''}
    height: 20px;
    width: 20px;
  }
`

export const SvgIcon = (props: IconProps & {children: JSX.Element}) => (
  <SvgIconEl class="icon" flip={props.flip}>
    {props.children}
  </SvgIconEl>
)
