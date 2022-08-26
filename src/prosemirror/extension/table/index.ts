import {EditorState, Selection} from 'prosemirror-state'
import {Schema} from 'prosemirror-model'
import {InputRule, inputRules} from 'prosemirror-inputrules'
import {keymap} from 'prosemirror-keymap'
import {
  addRowAfter,
  deleteRow,
  deleteTable,
  nextCell,
  selectionCell,
  tableNodes,
} from 'prosemirror-tables'
import {ProseMirrorExtension} from '../../state'
import {cellMenu} from './cell-menu'

export const tableInputRule = (schema: Schema) => new InputRule(
  new RegExp('^\\|{2,}\\s$'),
  (state: EditorState, match: string[], start: number, end: number) => {
    const tr = state.tr
    const columns = [...Array(match[0].trim().length - 1)]
    const headers = columns.map(() => schema.nodes.table_header.createAndFill())
    const cells = columns.map(() => schema.nodes.table_cell.createAndFill())
    const table = schema.nodes.table.createChecked(null, [
      schema.nodes.table_row.createChecked(null, headers),
      schema.nodes.table_row.createChecked(null, cells),
    ])

    tr.delete(start - 1, end)
    tr.insert(start - 1, table)
    tr.setSelection(Selection.near(tr.doc.resolve(start)))
    return tr
  }
)

const defaultSchema = tableNodes({
  tableGroup: 'block',
  cellContent: 'text*',
  cellAttributes: {
    style: {
      default: null,
      getFromDOM(dom: HTMLElement) {
        return dom.style.cssText
      },
      setDOMAttr(value, attrs) {
        if (value) attrs.style = value
      },
    },
  },
})

const schema = {
  ...defaultSchema,
  table: {
    ...defaultSchema.table,
    selectable: true,
    draggable: true,
    toDOM: () => [
      'div',
      {
        class: 'table-container',
        'data-type': 'table',
      },
      ['table', 0]
    ],
  },
}

export default (): ProseMirrorExtension => ({
  schema: (prev) => ({
    ...prev,
    nodes: (prev.nodes as any).append(schema),
  }),
  plugins: (prev, schema) => [
    keymap({
      'Ctrl-Enter': (state, dispatch) => {
        const cellPos = selectionCell(state)
        if (!cellPos) return false
        const before = state.doc.resolve(cellPos.before())
        const targetPos = before.after()
        const tr = state.tr
        tr.insert(targetPos, state.schema.nodes.paragraph.createAndFill())
        tr.setSelection(Selection.near(tr.doc.resolve(targetPos)))
        dispatch(tr)
        return true
      },
      'Backspace': (state, dispatch, view) => {
        const sel = state.selection
        if (!sel.empty) return false
        const cellPos = selectionCell(state)
        if (!cellPos) return false
        if (cellPos.nodeAfter.content.size > 0) {
          return false
        }

        const pos = nextCell(cellPos, 'horiz', -1)
        if (pos) {
          const tr = state.tr
          const target = tr.doc.resolve(pos.pos + pos.nodeAfter.content.size + 1)
          tr.setSelection(Selection.near(target))
          dispatch(tr)
          return true
        } else {
          const above = nextCell(cellPos, 'vert', -1)
          const cell = selectionCell(state)
          if (!above && cell.node(-1).textContent === '') {
            deleteTable(state, dispatch)
            return true
          }

          deleteRow(view.state, view.dispatch)
          if (above) {
            const tr = view.state.tr
            tr.setSelection(Selection.near(tr.doc.resolve(above.pos)))
            view.dispatch(tr)
          }

          return true
        }

        return false
      },
      'Enter': (state, dispatch, view) => {
        const sel = state.selection
        if (!sel.empty) return false
        const cellPos = selectionCell(state)
        if (!cellPos) return false
        addRowAfter(state, dispatch)
        const cur = view.state.doc.resolve(sel.$head.before())
        const pos = nextCell(cur, 'vert', 1)
        const tr = view.state.tr
        tr.setSelection(Selection.near(pos))
        view.dispatch(tr)
        return true
      },
      'ArrowUp': (state, dispatch) => {
        const sel = state.selection
        if (!sel.empty) return false
        const cellPos = selectionCell(state)
        if (!cellPos) return false
        const pos = nextCell(cellPos, 'vert', -1)
        if (pos) {
          const tr = state.tr
          tr.setSelection(Selection.near(pos))
          dispatch(tr)
          return true
        } else if (cellPos.before() - 1 === 0) {
          const tr = state.tr
          tr.insert(0, state.schema.node('paragraph'))
          tr.setSelection(Selection.near(tr.doc.resolve(0)))
          dispatch(tr)
          return true
        }

        return false
      },
      'ArrowDown': (state, dispatch) => {
        const sel = state.selection
        if (!sel.empty) return false
        const cellPos = selectionCell(state)
        if (!cellPos) return false
        const pos = nextCell(cellPos, 'vert', 1)
        if (pos) {
          const tr = state.tr
          tr.setSelection(Selection.near(pos))
          dispatch(tr)
          return true
        }

        return false
      },
    }),
    ...prev,
    inputRules({rules: [tableInputRule(schema)]}),
    cellMenu,
  ],
})
