import {h} from 'hyperapp'
import {setRange} from 'selection-ranges'
import {freestyle} from '../styles'
import {OnTextChange} from '../actions'
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
    'background': 'linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0))',
    'position': 'fixed',
    'z-index': '1',
  },
  '&:after': {
    'content': '""',
    'height': '50px',
    'width': '100%',
    'background': 'linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))',
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
  '& blockquote': {
    'border-left': '10px solid #eee',
    'margin': '0',
    'padding-left': '20px',
  }
})

interface Props {
  text: string,
}

class CustomEditor extends HTMLDivElement {
  connectedCallback() {
    this.innerHTML = this.textContent
    this.querySelectorAll('textarea').forEach(x => codemirror.fromTextArea(x))
    this.focus()
    document.getSelection().collapse(this, this.childNodes.length)
  }
}

const OnPaste = (_, e: ClipboardEvent) => {
  setTimeout(() => {
    const elm = e.target as Element
    elm.querySelectorAll('.CodeMirror').forEach(x => codemirror.fromDiv(x))
  })
}

const matchText = (node: Node, text: string) => {
  return node.textContent.replace(/\u00A0/g, ' ') === text
}

const OnKeyDown = (state, e: KeyboardEvent) => {
  const elm = e.currentTarget as HTMLElement
  let sel = window.getSelection()
  let cur = sel.focusNode

  const findTarget = (node: Node) => {
    if(node.parentNode === elm) return node
    else return findTarget(node.parentNode)
  }

  const insertAfter = (newElement, targetElement) => {
    var parent = targetElement.parentNode
    if(parent.lastChild == targetElement) {
      parent.appendChild(newElement)
    } else {
      parent.insertBefore(newElement, targetElement.nextSibling)
    }
  }

  if(e.keyCode === 13 && e.shiftKey) {
    const node = document.createElement('div')
    node.appendChild(document.createTextNode('...'))
    if(cur === elm) elm.appendChild(node)
    else insertAfter(node, findTarget(cur))
    setRange(node, {start: 0, end: 3})
    e.preventDefault()
  }

  return state
}

const OnKeyUp = (s, e: KeyboardEvent) => {
  const elm = e.currentTarget as HTMLElement
  let sel = window.getSelection()
  let cur = sel.focusNode

  if(cur && matchText(cur, '```')) {
    const textarea = document.createElement('textarea') as HTMLTextAreaElement
    cur.parentNode.replaceChild(textarea, cur)
    codemirror.fromTextArea(textarea)
  }

  if(cur && matchText(cur, '# ')) {
    const node = document.createElement('h1')
    node.appendChild(document.createTextNode('Heading 1'))
    cur.parentNode.replaceChild(node, cur)
    setRange(node, {start: 0, end: 9})
  }

  if(cur && matchText(cur, '## ')) {
    const node = document.createElement('h2')
    node.appendChild(document.createTextNode('Heading 2'))
    cur.parentNode.replaceChild(node, cur)
    setRange(node, {start: 0, end: 9})
  }

  if(cur && matchText(cur, '### ')) {
    const node = document.createElement('h3')
    node.appendChild(document.createTextNode('Heading 3'))
    cur.parentNode.replaceChild(node, cur)
    setRange(node, {start: 0, end: 9})
  }

  if(cur && matchText(cur, '> ')) {
    const node = document.createElement('blockquote')
    node.appendChild(document.createTextNode('Blockquote'))
    cur.parentNode.replaceChild(node, cur)
    setRange(node, {start: 0, end: 10})
  }

  const result = elm.cloneNode(true) as Element
  result.querySelectorAll('.CodeMirror')
    .forEach(x => x.parentNode.removeChild(x))
  result.querySelectorAll('textarea')
    .forEach(x => x.removeAttribute('style'))

  return OnTextChange(s, result.innerHTML)
}

(window as any).customElements.define('custom-editor', CustomEditor, {extends: 'div'})

export default (props: Props) => (
  <div class={editor}>
    <div is="custom-editor"
      contenteditable
      class={textarea}
      placeholder="Start typing..."
      onpaste={OnPaste}
      onkeydown={OnKeyDown}
      onkeyup={OnKeyUp}
    >{props.text}</div>
  </div>
)
