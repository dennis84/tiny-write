import {h} from 'hyperapp'
import {freestyle} from '../styles'
import {Config} from '..'
import {wordCount} from '../utils/text'

const text = (config: Config) => freestyle.registerStyle({
  'grid-column-start': '2',
  'font-size': '20px',
  'color': config.light ? '#999' : '#c4c7cc',
  'pointer-events': 'none',
  'user-select': 'none',
})

interface Props {
  text: string,
  config: Config,
}

export default (props: Props) => (
  <span class={text(props.config)}>{wordCount(props.text)} words</span>
)
