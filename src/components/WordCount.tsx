import {h} from 'hyperapp'
import {freestyle, rgba} from '../styles'
import {color} from '../config'
import {Config} from '..'
import {wordCount} from '../utils/text'

const text = (config: Config) => freestyle.registerStyle({
  'grid-column-start': '2',
  'font-size': '20px',
  'color': rgba(color(config), 0.5),
  'pointer-events': 'none',
  'user-select': 'none',
})

interface Props {
  text: string;
  config: Config;
}

export default (props: Props) => (
  <span class={text(props.config)}>{wordCount(props.text)} words</span>
)
