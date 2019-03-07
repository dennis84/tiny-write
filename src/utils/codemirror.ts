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

const options = {
  theme: 'dracula',
  mode: 'javascript',
}

export const fromDiv = (e: Element) => {
  init(CodeMirror((elt) => {
    e.parentNode.replaceChild(elt, e)
  }, options))
}

export const fromTextArea = (textarea: HTMLTextAreaElement) => {
  init(CodeMirror.fromTextArea(textarea, options))
}

const init = (codemirror: CodeMirror) => {
  const wrapper = codemirror.getWrapperElement()
  const button = document.createElement('button')
  button.classList.add('codemirror-close')
  button.innerHTML = clear.default
  button.addEventListener('click', (e) => {
    if(wrapper.previousSibling) {
      wrapper.parentNode.removeChild(wrapper.previousSibling)
    }
    wrapper.parentNode.removeChild(wrapper)
  })

  wrapper.appendChild(button)
  codemirror.focus()

  return codemirror
}
