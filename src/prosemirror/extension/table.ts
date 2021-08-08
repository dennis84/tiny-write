import {tableNodes} from 'prosemirror-tables'

const tableSchema = {
  ...tableNodes({
    tableGroup: 'block',
    cellContent: 'inline*',
  }),
  table: {
    content: '(table_head | table_body)*',
    tableRole: 'table',
    isolating: true,
    group: 'block',
    parseDOM: [{tag: 'table'}],
    toDOM: () => ['div', {class: 'table-container'}, ['table', 0]],
  },
  table_head: {
    content: 'table_row',
    isolating: true,
    group: 'table_block',
    selectable: false,
    parseDOM: [{tag: 'thead'}],
    toDOM: () => ['thead', 0],
  },
  table_body: {
    content: 'table_row+',
    isolating: true,
    group: 'table_block',
    selectable: false,
    parseDOM: [{tag: 'tbody'}],
    toDOM: () => ['tbody', 0],
  },
  table_cell: {
    content: 'inline*',
    isolating: true,
    group: 'table_block',
    selectable: false,
    attrs: {style: {default: null}},
    parseDOM: [{
      tag: 'td',
      getAttrs: (dom: HTMLElement) => {
        const textAlign = dom.style.textAlign
        return textAlign ? {style: `text-align: ${textAlign}`} : null
      },
    }],
    toDOM: (node) => ['td', node.attrs, 0],
  },
  table_header: {
    content: 'inline*',
    isolating: true,
    group: 'table_block',
    selectable: false,
    attrs: {style: {default: null}},
    parseDOM: [{
      tag: 'th',
      getAttrs: (dom: HTMLElement) => {
        const textAlign = dom.style.textAlign
        return textAlign ? {style: `text-align: ${textAlign}`} : null
      },
    }],
    toDOM: (node) => ['th', node.attrs, 0],
  },
}

export default {
  schema: (prev) => ({
    ...prev,
    nodes: prev.nodes.append(tableSchema),
  }),
}
