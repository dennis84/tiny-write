import React from 'react'
import {Node} from 'slate'
import {freestyle, rgba} from '../styles'
import {color} from '../config'
import {Config} from '..'

const text = (config: Config) => freestyle.registerStyle({
  'grid-column-start': '2',
  'font-size': '20px',
  'color': rgba(color(config), 0.5),
  'pointer-events': 'none',
  'user-select': 'none',
})

interface Props {
  text: Node[];
  config: Config;
}

export default (props: Props) => {
  const count = props.text
    .map((node) => Node.string(node).split(/\s+/).filter(x => x != '').length)
    .reduce((a, b) => a + b, 0)

  return (
    <span className={text(props.config)}>{count} words</span>
  )
}
