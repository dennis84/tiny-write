import {h} from 'hyperapp'
import {freestyle} from '../styles'

const text = freestyle.registerStyle({
  'font-size': '20px',
  'color': '#999',
  'padding': '20px 0',
  'pointer-events': 'none',
  'user-select': 'none',
})

interface Props {
  text: string,
}

const wordCount = (str: string) =>
  !str ? 0 : str.split(/\s+/).filter(x => x != '').length

export default (props: Props) => (
  <div class={text}>{wordCount(props.text)} words</div>
)
