import React from 'react'
import styled from '@emotion/styled'
import {rgba} from '../styles'
import {EditorState} from 'prosemirror-state'
import {color} from '../config'

const Text = styled.span<any>`
  grid-column-start: 2;
  font-size: 20px;
  color: ${props => rgba(color(props.theme), 0.5)};
  pointer-events: none;
  user-select: none;
`

interface Props {
  text: EditorState;
}

export default (props: Props) => {
  let count = 0
  props.text.doc.forEach((node) => {
    count += node.textContent.split(/\s+/).filter(x => x != '').length
  })

  return (
    <Text>{count} words</Text>
  )
}
