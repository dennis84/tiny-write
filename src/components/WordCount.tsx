import {h} from 'hyperapp'
import {freestyle} from '../styles'
import {Config} from '..'
import {wordCount} from '../utils/text'

const text = (config: Config) => freestyle.registerStyle({
  'font-size': '20px',
  'color': config.light ? '#999' : '#c4c7cc',
  'pointer-events': 'none',
  'user-select': 'none',
  'height': '50px',
  'width': '100%',
  'display': 'flex',
  'justify-content': 'center',
  'align-items': 'center',
  'position': 'absolute',
  'bottom': '0',
})

interface Props {
  text: string,
  config: Config,
}

export default (props: Props) => (
  <div class={text(props.config)}>{wordCount(props.text)} words</div>
)
