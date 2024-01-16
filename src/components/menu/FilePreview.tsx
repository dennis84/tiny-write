import {createSignal, createEffect} from 'solid-js'
import h from 'solid-js/h'
import {Node} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirrorJSON} from 'y-prosemirror'
import {File, useState} from '@/state'
import {createExtensions, createSchema} from '@/prosemirror-setup'

export default (p: {file: File}) => {
  const [, ctrl] = useState()
  const maxLen = 300
  const maxText = 150
  const maxCode = 80
  const [content, setContent] = createSignal<Node[]>([])

  const schema = createSchema(createExtensions({ctrl, markdown: false}))

  createEffect(() => {
    const ydoc = new Y.Doc({gc: false})
    Y.applyUpdate(ydoc, p.file.ydoc)
    const state = yDocToProsemirrorJSON(ydoc, p.file.id)
    const doc = Node.fromJSON(schema, state)
    const nodes: any = []
    let len = 0
    let done = false

    doc.descendants((node, _, parent) => {
      if (len >= maxLen) {
        if (!done) nodes.push(h('span', {}, '…'))
        done = true
        return false
      } else if (node.type.name === 'image') {
        nodes.push(h('img', {src: node.attrs.src, alt: '️🖼️'}))
      } else if (node.type.name === 'video') {
        nodes.push(h('span', {}, '️🎬 '))
      } else if (parent?.type.name === 'code_block') {
        let text = node.textContent
        if (text.length > maxCode) {
          text = text.slice(0, maxCode) + '…'
        }
        nodes.push(h('pre', h('code', {}, text)))
        nodes.push(h('span', {}, ' '))
        len += text.length + 1
      } else if (node.isText) {
        const nodeType = parent?.type.name === 'heading' ? 'h2' : 'p'
        let text = node.textContent
        if (text.length > maxText) {
          text = text.slice(0, maxText) + '…'
        }
        nodes.push(h(nodeType, {}, text + ' '))
        len += text.length + 1
      }
    })

    setContent(nodes)
  })

  return <>{content()}</>
}
