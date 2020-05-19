import React from 'react'
import {Node} from 'slate'
import styled from '@emotion/styled'
import {rgba} from '../styles'
import {color} from '../config'
import {Config} from '..'

const Text = styled.span<any>`
  grid-column-start: 2;
  font-size: 20px;
  color: ${props => rgba(color(props.config), 0.5)};
  pointer-events: none;
  user-select: none;
`

interface Props {
  text: Node[];
  config: Config;
}

export default (props: Props) => {
  const count = props.text
    .map((node) => Node.string(node).split(/\s+/).filter(x => x != '').length)
    .reduce((a, b) => a + b, 0)

  return (
    <Text config={props.config}>{count} words</Text>
  )
}
