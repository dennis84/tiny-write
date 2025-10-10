import type {DOMOutputSpec, Node} from 'prosemirror-model'
import {Align} from './interfaces'

export const imageSchemaSpec = {
  nodes: {
    image: {
      inline: true,
      attrs: {
        src: {},
        alt: {default: null},
        title: {default: null},
        width: {default: null},
        align: {default: Align.FloatLeft},
      },
      group: 'inline',
      selectable: true,
      draggable: true,
      toDOM(node: Node): DOMOutputSpec {
        return [
          'img',
          {
            src: node.attrs.src,
            title: node.attrs.title,
            alt: node.attrs.alt,
          },
        ]
      },
    },
    video: {
      inline: true,
      attrs: {
        src: {},
        type: {},
        title: {default: null},
        width: {default: null},
        align: {default: Align.FloatLeft},
      },
      group: 'inline',
      draggable: true,
      selectable: true,
      toDOM(node: Node): DOMOutputSpec {
        return [
          'video',
          {title: node.attrs.title},
          ['source', {src: node.attrs.src, type: node.attrs.type}],
        ]
      },
    },
  },
}
