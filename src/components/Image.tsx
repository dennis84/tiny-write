import React from 'react'
import styled from '@emotion/styled'
import {useSelected, useFocused} from 'slate-react'

const Image = styled.img<any>`
  display: block;
  max-width: 100%;
  box-shadow: ${props => props.selected && props.focused ? `0 0 0 5px #aee` : 'none'};
  border-radius: 1px;
`

export default ({attributes, element, children}) => {
  const selected = useSelected()
  const focused = useFocused()

  return (
    <div {...attributes}>
      <div contentEditable={false}>
        <Image src={element.url} selected={selected} focused={focused} />
      </div>
      {children}
    </div>
  )
}
