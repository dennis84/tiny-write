import {h} from 'hyperapp'
import {freestyle} from '../styles'
import {Config} from '..'

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
}

export default (props: Props) => (
  <div class={text(props.config)}>{wordCount(props.text)} words</div>
)
