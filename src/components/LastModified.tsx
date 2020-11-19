import React from 'react'
import {differenceInHours, format} from 'date-fns'
import styled from '@emotion/styled'
import {color} from '../config'
import {rgba} from '../styles'

const Text = styled.span`
  font-size: 12px;
  color: ${props => rgba(color(props.theme), 0.5)};
  pointer-events: none;
  user-select: none;
  justify-self: flex-end;
`

interface Props {
  lastModified?: Date;
}

const formatDate = (date: Date) => {
  const now = new Date()

  if (differenceInHours(now, date) <= 24) {
    return format(date, 'HH:mm:ss')
  } else if (date.getFullYear() === now.getFullYear()) {
    return format(date, 'dd MMMM')
  }

  return format(date, 'dd MMMM YYYY')
}

export default (props: Props) => props.lastModified ? (
  <Text>Edited {formatDate(props.lastModified)}</Text>
) : (
  <Text>Nothing yet</Text>
)
