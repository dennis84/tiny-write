import {h} from 'hyperapp'
import dayjs from 'dayjs'
import {freestyle, rgba} from '../styles'
import {color} from '../config'
import {Config} from '..'

const text = (config: Config) => freestyle.registerStyle({
  'font-size': '12px',
  'color': rgba(color(config), 0.5),
  'pointer-events': 'none',
  'user-select': 'none',
  'justify-self': 'flex-end',
})

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
  <span class={text(props.config)}>Edited {format(props.lastModified)}</span>
)
