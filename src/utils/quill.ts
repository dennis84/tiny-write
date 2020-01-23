import Quill from 'quill'
import Delta from 'quill-delta'
import {CodeMirror} from 'codemirror'
import {fromTextArea, modeByLang} from './codemirror'

export const isEmpty = (delta: Delta) =>
  delta.ops.length === 0 ||
  delta.ops.length === 1 &&
  delta.ops[0].insert === ''

export const toText = (delta: Delta) => {
  let text = ''
  for (const op of delta.ops) {
    if (op.insert && typeof op.insert === 'string') {
      text += op.insert + ' '
    }
  }

  return text
}

export const parseDelta = (str): Delta => {
  let delta = {ops: []}
  try {
    delta = JSON.parse(str)
  } catch (err) {}

  return new Delta(delta.ops)
}

export const create = (node: HTMLElement, delta: Delta) => {
  const quill = new Quill(node, {
    theme: 'snow',
    placeholder: node.dataset.placeholder,
    modules: {
      toolbar: null,
      keyboard: {
        bindings: {
          header: {
            key: ' ',
            prefix: /^(#){1,6}/,
            handler: function (range, context) {
              const size = context.prefix.length
              this.quill.formatLine(range.index, 0, 'header', size)
              this.quill.deleteText(range.index - size, size)
            }
          },
          blockquote: {
            key: ' ',
            prefix: /^(>)/,
            handler: function (range, context) {
              this.quill.formatLine(range.index, 1, 'blockquote', true)
              this.quill.deleteText(range.index - 1, 1)
            }
          },
          codeblock: {
            key: ' ',
            prefix: /^`{3}([a-z+-]*)/,
            handler: function (range, context) {
              const [,lang] = /^`{3}([a-z+-]*)/.exec(context.prefix)
              this.quill.formatLine(range.index, 1, 'code-block', {lang, state: 'focused'})
              this.quill.deleteText(range.index, context.prefix.length)
            }
          },
          code: {
            key: ' ',
            prefix: /`(.+?)`/,
            handler: function (range, context) {
              const [,code] = /`(.+?)`/.exec(context.prefix)
              const startIndex = range.index - (code.length + 2)
              this.quill.deleteText(startIndex, code.length + 2)
              this.quill.insertText(startIndex, code, {code: true})
              this.quill.format('code', false)
              this.quill.insertText(this.quill.getSelection(), ' ')
            }
          },
          exitBlockWithEnter: {
            key: 'enter',
            format: ['blockquote'],
            collapsed: true,
            empty: true,
            handler: function (range, context) {
              this.quill.formatText(range.index, range.length + 1, {blockquote: null})
              return false
            }
          },
        }
      }
    },
  })

  const BlockEmbed = Quill.import('blots/block/embed')

  class CodeBlockRule extends BlockEmbed {
    public static blotName = 'code-block'
    public static tagName = 'DIV'
    private cm: CodeMirror = null

    static create(value: any) {
      const domNode = super.create()
      domNode.style.pointerEvents = 'none'
      domNode.setAttribute('lang', value.lang)
      domNode.setAttribute('state', 'created')
      domNode.setAttribute('content', value.content)
      return domNode
    }

    constructor(domNode, value) {
      super(domNode, value)
      const textarea = document.createElement('textarea')
      textarea.value = value.content || ''
      domNode.appendChild(textarea)

      setTimeout(() => {
        this.cm = fromTextArea(textarea, {
          theme: node.dataset.theme,
          mode: modeByLang(value.lang || 'javascript'),
        })

        if (value.state === 'focused') {
          this.focus()
        }

        this.cm.on('changes', () => {
          domNode.setAttribute('content', this.cm.getValue())
        })

        this.cm.on('keydown', (cm, e) => {
          const line = cm.getCursor().line
          if (e.keyCode === 13 && e.shiftKey) {
            quill.insertText(quill.getSelection() + 1, ' ')
          } else if (e.keyCode === 38 && line === 0) {
            quill.setSelection(quill.getSelection().index - 1, 0, 'silent')
          } else if (e.keyCode === 40 && line === cm.doc.size - 1) {
            quill.setSelection(quill.getSelection().index + 1, 0, 'silent')
          }
        })
      }, 0)
    }

    focus() {
      this.cm.focus()
    }

    static formats(node) {
      return {
        lang: node.getAttribute('lang'),
        content: node.getAttribute('content'),
        state: node.getAttribute('state'),
      }
    }

    static value(node) {
      return {
        lang: node.getAttribute('lang'),
        content: node.getAttribute('content'),
        state: node.getAttribute('state'),
      }
    }
  }

  Quill.register(CodeBlockRule)
  quill.setContents(delta)
  delete quill.keyboard.bindings[13][quill.keyboard.bindings[13].length - 1]

  quill.on('text-change', (e) => {
    const selection = quill.getSelection()
    if (selection) {
      const text = quill.getText(selection.index, quill.getLength())
      if (text.trim() === '') {
        const editor = node.querySelector('.ql-editor') as HTMLElement
        (node.parentNode as HTMLElement).scrollTop = editor.offsetHeight
      }
    }

    const delta = quill.getContents()
    node.dispatchEvent(new CustomEvent('change', {detail: {delta}}))
  })

  quill.on('selection-change', (range) => {
    if (range) {
      if (range.length == 0) {
        const [blot] = quill.getLeaf(range.index)
        if (blot instanceof CodeBlockRule) {
          blot.focus()
        }
      }
    }
  })

  return quill
}
