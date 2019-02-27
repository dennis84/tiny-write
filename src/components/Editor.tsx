import {h} from 'hyperapp'

import {freestyle} from '../styles'
import {OnTextChange} from '../actions'
import {getNodeAt} from '../utils/caret'
import CodeMirror from 'codemirror'
import * as caret from 'caret-pos'
import 'codemirror/mode/javascript/javascript'

const fonts = {
  times: 'Times New Roman',
  roboto: 'Roboto Slab',
  playfair: 'Playfair Display',
  merriweather: 'Merriweather',
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
  'width': '100%',
  'min-height': '100%',
  'font-size': '24px',
  'font-family': fonts.merriweather,
  'padding': '50px',
  'border': '0',
  'color': '#4a4a4a',
  'line-height': '160%',
  'background': 'transparent',
  '&::-webkit-scrollbar': {
    'display': 'none',
  },
  '& .CodeMirror': {
    'border-radius': '3px',
    'box-shadow': '0 2px 5px rgba(0,0,0,0.2)',
    'height': 'auto',
  }
})

const OnCreate = (text: string) => (elm: HTMLElement) => {
  elm.innerHTML = text ? text : ''
  elm.focus()
  document.getSelection().collapse(elm, elm.childNodes.length)
}

const OnKeyUp = (s, e: KeyboardEvent) => {
  const elm = e.target as HTMLElement
  const text = (e.target as Element).innerHTML
  const position = caret.position(elm).pos
  const node = getNodeAt(elm, position)

  if(node && node.textContent === '```') {
    const code = document.createElement('textarea') as Element
    node.parentNode.replaceChild(code, node)
    const codemirror = CodeMirror.fromTextArea(code, {
      theme: 'dracula',
      mode: 'javascript',
    })

    codemirror.focus()
    return OnTextChange(s, text, position-3, true)
  }

  return OnTextChange(s, text, position, s.codemirror)
}

interface Props {
  text: string,
  position: number,
}

export default (props: Props) => (
  <div class={editor}>
    <div
      contenteditable
      class={textarea}
      placeholder="Start typing..."
      onCreate={OnCreate(props.text)}
      onKeyUp={OnKeyUp}
    ></div>
  </div>
)
