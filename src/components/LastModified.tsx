import React from 'react'
import dayjs from 'dayjs'
import styled from '@emotion/styled'
import {rgba} from '../styles'
import {color} from '../config'
import {Config} from '..'

const Text = styled.span<any>`
  font-size: 12px;
  color: ${props => rgba(color(props.config), 0.5)};
  pointer-events: none;
  user-select: none;
  justify-self: flex-end;
`

interface Props {
  lastModified: Date;
  config: Config;
}

const format = (date: Date) => {
  const day = dayjs(date)
  const now = dayjs()

  if (now.diff(day, 'hour') <= 24) {
    return day.format('HH:mm:ss')
  } else if (day.year() === now.year()) {
    return day.format('DD MMMM')
  }

  return day.format('DD MMMM YYYY')
}

export default (props: Props) => (
  <Text config={props.config}>Edited {format(props.lastModified)}</Text>
)
