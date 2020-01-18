import {h} from 'hyperapp'
import {Delta} from 'quill'
import {freestyle, rgba} from '../styles'
import {color} from '../config'
import {Config} from '..'
import {toText} from '../utils/quill'

const text = (config: Config) => freestyle.registerStyle({
  'grid-column-start': '2',
  'font-size': '20px',
  'color': rgba(color(config), 0.5),
  'pointer-events': 'none',
  'user-select': 'none',
})

interface Props {
  text: Delta;
  config: Config;
}

export default (props: Props) => {
  let count = toText(props.text).split(/\s+/).filter(x => x != '').length
  return (
    <span class={text(props.config)}>{count} words</span>
  )
}
