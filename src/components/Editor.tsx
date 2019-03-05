import {h} from 'hyperapp'
import * as caret from 'caret-pos'
import {freestyle} from '../styles'
import {OnTextChange} from '../actions'
import {getNodeAt} from '../utils/caret'
import * as codemirror from '../utils/codemirror'

const fonts = {
  times: 'Times New Roman',
  merriweather: 'Merriweather',
  iosevka: 'Iosevka Term Slab',
}

const editor = freestyle.registerStyle({
  'width': '100%',
  'height': 'calc(100vh - 50px)',
  'overflow-y': 'auto',
  'position': 'relative',
  '&:before': {
    'content': '""',
    'height': '50px',
    'width': '100%',
    'background': 'linear-gradient(to bottom, rgba(242,242,242,1), rgba(242,242,242,0))',
    'position': 'fixed',
    'z-index': '1',
  },
  '&:after': {
    'content': '""',
    'height': '50px',
    'width': '100%',
    'background': 'linear-gradient(to top, rgba(242,242,242,1), rgba(242,242,242,0))',
    'position': 'fixed',
    'z-index': '1',
    'bottom': '50px',
  },
})

const textarea = freestyle.registerStyle({
  'min-height': '100%',
  'font-size': '24px',
  'font-family': fonts.merriweather,
  'margin': '50px',
  'border': '0',
  'color': '#4a4a4a',
  'line-height': '160%',
  'background': 'transparent',
  'outline': 'none',
  '-webkit-app-region': 'no-drag',
  '&:empty::before': {
    'content': 'attr(placeholder)',
    'color': '#999',
  },
  '&::-webkit-scrollbar': {
    'display': 'none',
  },
})

interface Props {
  text: string,
  position: number,
}

const OnCreate = (props: Props) => (elm: HTMLElement) => {
  elm.innerHTML = props.text
  elm.querySelectorAll('textarea').forEach(x => codemirror.fromTextArea(x))
  elm.focus()
  document.getSelection().collapse(elm, elm.childNodes.length)
}

const OnKeyUp = (s, e: KeyboardEvent) => {
  const elm = e.target as HTMLElement
  let position = caret.position(elm).pos
  const cur = getNodeAt(elm, position)

  if(cur && cur.textContent === '```') {
    const textarea = document.createElement('textarea') as HTMLTextAreaElement
    cur.parentNode.replaceChild(textarea, cur)
    codemirror.fromTextArea(textarea)
    position = position-3
  }

  const result = elm.cloneNode(true) as Element
  result.querySelectorAll('.CodeMirror')
    .forEach(x => x.parentNode.removeChild(x))
  result.querySelectorAll('textarea')
    .forEach(x => x.removeAttribute('style'))

  return OnTextChange(s, result.innerHTML, position)
}

export default (props: Props) => (
  <div class={editor}>
    <div
      contenteditable
      class={textarea}
      placeholder="Start typing..."
      onCreate={OnCreate(props)}
      onKeyUp={OnKeyUp}
    ></div>
  </div>
)
