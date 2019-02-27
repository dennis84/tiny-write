import {h} from 'hyperapp'
import {freestyle} from '../styles'
import {getAllTextnodes} from '../utils/caret'

const text = freestyle.registerStyle({
  'font-size': '20px',
  'color': '#999',
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
}

const wordCount = (str: string) => {
  const container = document.createElement('div')
  container.innerHTML = str
  const count = getAllTextnodes(container).reduce((acc, node) => {
    return acc + node.textContent.split(/\s+/).filter(x => x != '').length
  }, 0)

  return !str ? 0 : count
}

export default (props: Props) => (
  <div class={text}>{wordCount(props.text)} words</div>
)
