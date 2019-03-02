import CodeMirror from 'codemirror'
import 'codemirror/mode/javascript/javascript'
import * as clear from '../icons/clear.svg'
import {freestyle} from '../styles'

freestyle.registerRule('.CodeMirror', {
  'border-radius': '3px',
  'box-shadow': '0 2px 5px rgba(0,0,0,0.2)',
  'height': 'auto',
  'font-family': 'Iosevka Term Slab',
  '.codemirror-close': {
    'position': 'absolute',
    'top': '10px',
    'right': '10px',
    'z-index': '2',
    'cursor': 'pointer',
    'background': 'none',
    'width': '24px',
    'height': '24px',
    'border': '0',
    'display': 'inline-flex',
    'justify-content': 'center',
    'align-items': 'center',
    'padding': '0',
    'svg': {
      'fill': '#fff',
      'width': '24px',
      'height': '24px',
    },
  }
})

export const replace = (el: Element) => {
  const code = document.createElement('textarea') as Element
  el.parentNode.replaceChild(code, el)
  const codemirror = CodeMirror.fromTextArea(code, {
    theme: 'dracula',
    mode: 'javascript',
  })

  const wrapper = codemirror.getWrapperElement()
  const button = document.createElement('button')
  button.classList.add('codemirror-close')
  button.innerHTML = clear.default
  button.addEventListener('click', (e) => {
    wrapper.parentNode.removeChild(wrapper)
  })

  wrapper.appendChild(button)
  codemirror.focus()
  return codemirror
}
