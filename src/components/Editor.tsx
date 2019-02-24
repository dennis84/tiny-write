import {h} from 'hyperapp'

import {freestyle} from '../styles'
import {OnTextChange} from '../actions'

const fonts = {
  times: 'Times New Roman',
  roboto: 'Roboto Slab',
  playfair: 'Playfair Display',
  merriweather: 'Merriweather',
}

const editor = freestyle.registerStyle({
  'width': '80%',
  'height': '100%',
  'display': 'flex',
  '&:before': {
    'content': '""',
    'width': '80%',
    'height': '40px',
    'background': 'linear-gradient(to bottom, rgba(242,242,242,1), rgba(242,242,242,0))',
    'position': 'absolute',
    'z-index': '1',
  }
})

const textarea = freestyle.registerStyle({
  'width': '100%',
  'height': '100%',
  'font-size': '24px',
  'font-family': fonts.merriweather,
  'outline': 'none',
  'resize': 'none',
  'padding-top': '40px',
  'border': '0',
  'color': '#4a4a4a',
  'line-height': '160%',
  'background': 'transparent',
  '&::-webkit-scrollbar': {
    'display': 'none',
  },
})

const FocusInput = (elm: HTMLElement) => elm.focus()

interface Props {
  text: string,
}

export default (props: Props) => (
  <div class={editor}>
    <textarea
      class={textarea}
      placeholder="Start typing..."
      onCreate={FocusInput}
      onKeyUp={OnTextChange}
    >{props.text ? props.text : ''}</textarea>
  </div>
)
