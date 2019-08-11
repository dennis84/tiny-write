import * as codemirror from '../utils/codemirror'

import {setRange} from 'selection-ranges'

const OnKeyDown = (e: KeyboardEvent) => {
  const elm = e.currentTarget as MarkdownEditor
  let sel = window.getSelection()
  let cur = sel.focusNode

  if (!e.metaKey && !e.ctrlKey && isCaretAtEnd(elm, cur)) {
    (elm.parentNode as HTMLElement).scrollTop = elm.offsetHeight
  }

  if(e.keyCode === 13 && e.shiftKey) {
    const node = document.createElement('div')
    node.appendChild(document.createTextNode('...'))
    if(cur === elm) elm.appendChild(node)
    else insertAfter(node, findLineNode(elm, cur))
    setRange(node, {start: 0, end: 3})
    e.preventDefault()
  }
}

const OnKeyUp = (e: KeyboardEvent) => {
  if (e.keyCode === 91) {
    return
  }

  const elm = e.currentTarget as MarkdownEditor
  const sel = window.getSelection()
  const cur = sel.focusNode
  const curText = cur.textContent.replace(/\u00A0/g, ' ')

  if(cur && /```[a-z+-]*\s/.test(curText)) {
    const mode = codemirror.modeByLang(curText.substring(3).trim())
    const textarea = document.createElement('textarea') as HTMLTextAreaElement
    textarea.dataset.mode = mode
    cur.parentNode.replaceChild(textarea, cur)
    codemirror.fromTextArea(textarea, {
      mode: mode,
      theme: elm.getAttribute('theme'),
    })
  }

  if(cur && curText === '# ') {
    const node = document.createElement('h1')
    node.appendChild(document.createTextNode('Heading 1'))
    cur.parentNode.replaceChild(node, cur)
    setRange(node, {start: 0, end: 9})
  }

  if(cur && curText === '## ') {
    const node = document.createElement('h2')
    node.appendChild(document.createTextNode('Heading 2'))
    cur.parentNode.replaceChild(node, cur)
    setRange(node, {start: 0, end: 9})
  }

  if(cur && curText === '### ') {
    const node = document.createElement('h3')
    node.appendChild(document.createTextNode('Heading 3'))
    cur.parentNode.replaceChild(node, cur)
    setRange(node, {start: 0, end: 9})
  }

  if(cur && curText === '> ') {
    const node = document.createElement('blockquote')
    node.appendChild(document.createTextNode('Blockquote'))
    cur.parentNode.replaceChild(node, cur)
    setRange(node, {start: 0, end: 10})
  }

  elm.dispatchEvent(new CustomEvent('change', {
    detail: { content: elm.getContent() },
    bubbles: false
  }));
}

const OnPaste = (e: ClipboardEvent) => {
  setTimeout(() => {
    (e.target as Element).querySelectorAll('.CodeMirror')
      .forEach(x => x.parentNode.removeChild(x))
  })
}

export class MarkdownEditor extends HTMLDivElement {
  static get observedAttributes() {
    return ['theme', 'content']
  }

  connectedCallback() {
    this.innerHTML = this.getAttribute('content')
    this.querySelectorAll('textarea').forEach(x => {
      codemirror.fromTextArea(x, {
        mode: x.dataset.mode,
        theme: this.getAttribute('theme')
      })
    })

    this.focus()
    document.getSelection().collapse(this, this.childNodes.length)

    this.addEventListener('keydown', OnKeyDown)
    this.addEventListener('keyup', OnKeyUp)
    this.addEventListener('paste', OnPaste)
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if(!oldValue) return

    if (name === 'content' && newValue === '') {
      this.innerHTML = ''
    } else if (name === 'theme') {
      this.querySelectorAll('.CodeMirror').forEach(x => {
        (x as any).CodeMirror.setOption('theme', newValue)
      })
    }
  }

  getContent() {
    const result = this.cloneNode(true) as Element
    result.querySelectorAll('.CodeMirror')
      .forEach(x => x.parentNode.removeChild(x))
    result.querySelectorAll('textarea')
      .forEach(x => x.removeAttribute('style'))
    return result.innerHTML
  }
}

const findLineNode = (editor: MarkdownEditor, node: Node) => {
  if(node.parentNode === editor) return node
  else return findLineNode(editor, node.parentNode)
}

const isCaretAtEnd = (editor: MarkdownEditor, node: Node) => {
  if (node === editor) {
    return true
  }

  const line = findLineNode(editor, node)
  return !line.nextSibling || !line.nextSibling.nextSibling
}

const insertAfter = (newElement, targetElement) => {
  var parent = targetElement.parentNode
  if(parent.lastChild == targetElement) {
    parent.appendChild(newElement)
  } else {
    parent.insertBefore(newElement, targetElement.nextSibling)
  }
}
