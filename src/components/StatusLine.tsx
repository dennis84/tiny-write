import React from 'react'
import {Node} from 'slate'
import styled from '@emotion/styled'
import LastModified from './LastModified'
import WordCount from './WordCount'

const StatusLine = styled.div`
  height: 50px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  justify-items: center;
  align-items: center;
  position: absolute;
  bottom: 0;
  padding: 0 20px;
`

interface Props {
  text: Node[];
  lastModified: Date;
}

export default (props: Props) => (
  <StatusLine>
    <WordCount text={props.text} />
    <LastModified lastModified={props.lastModified} />
  </StatusLine>
)
