import {h} from 'hyperapp'
import {freestyle} from '../styles'

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
  const el = document.createElement('div')
  el.innerHTML = str

  let count = 0
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false)
  while(walk.nextNode()) {
    count += walk.currentNode.textContent
      .split(/\s+/).filter(x => x != '').length
  }

  return count
  return !str ? 0 : count
}

export default (props: Props) => (
  <div class={text}>{wordCount(props.text)} words</div>
)
