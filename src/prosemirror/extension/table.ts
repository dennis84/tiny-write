import {EditorState, Selection} from 'prosemirror-state'
import {Node, Schema, ResolvedPos} from 'prosemirror-model'
import {InputRule, inputRules} from 'prosemirror-inputrules'
import {keymap} from 'prosemirror-keymap'
import {ProseMirrorExtension} from '../state'

export const tableInputRule = (schema: Schema) => new InputRule(
  new RegExp('^\\|{2,}\\s$'),
  (state: EditorState, match: string[], start: number, end: number) => {
    const tr = state.tr
    const columns = [...Array(match[0].trim().length - 1)]
    const headers = columns.map(() => schema.node(schema.nodes.table_header, {}))
    const cells = columns.map(() => schema.node(schema.nodes.table_cell, {}))
    const table = schema.node(schema.nodes.table, {}, [
      schema.node(schema.nodes.table_head, {}, schema.node(schema.nodes.table_row, {}, headers)),
      schema.node(schema.nodes.table_body, {}, schema.node(schema.nodes.table_row, {}, cells)),
    ])

    tr.delete(start, end)
    tr.insert(start, table)
    tr.setSelection(Selection.near(tr.doc.resolve(start + 3)))
    return tr
  }
)

const tableSchema = {
  table: {
    content: '(table_head | table_body)*',
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
  table_row: {
    content: '(table_cell | table_header)*',
    parseDOM: [{tag: 'tr'}],
    toDOM: () => ['tr', 0],
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
    toDOM: (node: Node) => ['td', node.attrs, 0],
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
    toDOM: (node: Node) => ['th', node.attrs, 0],
  },
}

const findParentPos = ($pos: ResolvedPos, fn: (n: Node) => boolean) => {
  if (fn($pos.node())) return $pos
  for (let d = $pos.depth - 1; d > 0; d--) {
    if (fn($pos.node(d))) return $pos.node(0).resolve($pos.before(d + 1))
  }
  return null
}

const findTableCellPos = ($pos: ResolvedPos, header = true) =>
  findParentPos($pos, (n) => n.type.name === 'table_cell' || (header && n.type.name === 'table_header'))

const findTableRowPos = ($pos: ResolvedPos) =>
  findParentPos($pos, (n) => n.type.name === 'table_row')

const findTableHeadPos = ($pos: ResolvedPos) =>
  findParentPos($pos, (n) => n.type.name === 'table_head')

const findTablePos = ($pos: ResolvedPos) =>
  findParentPos($pos, (n) => n.type.name === 'table')

const getContentSize = (n: Node) => {
  let size = 0
  n.descendants((d: Node) => {
    size += d.content.size
  })

  return size
}

export default (): ProseMirrorExtension => ({
  schema: (prev) => ({
    ...prev,
    nodes: (prev.nodes as any).append(tableSchema),
  }),
  plugins: (prev, schema) => [
    keymap({
      'Ctrl-Enter': (state, dispatch) => {
        const tablePos = findTablePos(state.selection.$head)
        if (!tablePos) return false
        const targetPos = tablePos.after()
        const tr = state.tr
        tr.insert(targetPos, state.schema.node('paragraph'))
        tr.setSelection(Selection.near(tr.doc.resolve(targetPos)))
        dispatch(tr)
        return true
      },
      'Backspace': (state, dispatch) => {
        const sel = state.selection
        if (!sel.empty) return false
        const cellPos = findTableCellPos(sel.$head)
        if (!cellPos) return false

        if (cellPos.node().content.size === 0) {
          const rowPos = findTableRowPos(sel.$head)
          const before = state.doc.resolve(sel.$head.pos - 2)
          const cellBeforePos = findTableCellPos(before)
          const inTableHead = !!findTableHeadPos(sel.$head)

          if (cellBeforePos) {
            const tr = state.tr
            tr.setSelection(Selection.near(before))
            dispatch(tr)
            return true
          } else if (!inTableHead && getContentSize(rowPos.node()) === 0) {
            const tr = state.tr
            tr.delete(before.pos - 1, before.pos + rowPos.node().nodeSize)
            dispatch(tr)
            return true
          }
        }

        return false
      },
      'Enter': (state, dispatch) => {
        const sel = state.selection
        if (!sel.empty) return false
        const cellPos = findTableCellPos(sel.$head)
        console.log(cellPos)
        if (!cellPos) return false

        const rowPos = findTableRowPos(sel.$head)
        const cells = []
        rowPos.node().forEach((cell) => {
          cells.push(schema.nodes.table_cell.create(cell.attrs))
        })
        const newRow = schema.nodes.table_row.create(null, cells)

        const theadPos = findTableHeadPos(sel.$head)
        if (theadPos) {
          const tablePos = findTablePos(sel.$head)
          let tbodyPos: number
          tablePos.node().descendants((node, pos) => {
            if (node.type.name === 'table_body') {
              tbodyPos = tablePos.pos + pos
            }
          })

          if (tbodyPos) {
            const tbody = state.doc.resolve(tbodyPos + 1)
            const tr = state.tr.insert(tbody.pos, newRow)
            tr.setSelection(Selection.near(tr.doc.resolve(tbody.pos)))
            dispatch(tr)
          } else {
            const tbody = schema.nodes.table_body.create(null, [newRow])
            const targetPos = theadPos.after()
            const tr = state.tr.insert(targetPos, tbody)
            tr.setSelection(Selection.near(tr.doc.resolve(targetPos)))
            dispatch(tr)
          }

          return true
        }

        const targetPos = sel.$head.after(-1)
        const tr = state.tr.insert(targetPos, newRow)
        tr.setSelection(Selection.near(tr.doc.resolve(targetPos)))

        dispatch(tr)
        return true
      },
    }),
    ...prev,
    inputRules({rules: [tableInputRule(schema)]}),
  ],
})
