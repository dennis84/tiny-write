import {Plugin, PluginKey} from 'prosemirror-state'
import {Decoration, DecorationSet} from 'prosemirror-view'

import {
  cellAround,
  nextCell,
  addColumnAfter,
  addColumnBefore,
  deleteColumn,
  deleteTable,
  CellSelection,
} from 'prosemirror-tables'

const createMenu = (type: 'right' | 'left' | 'bottom' | 'top') => {
  const button = document.createElement('span')
  button.setAttribute('contenteditable', 'false')
  button.classList.add(`table-menu-${type}`)
  if (type === 'right') {
    button.title = 'Add column'
    button.textContent = '+'
  } else if (type === 'left') {
    button.title = 'Add column'
    button.textContent = '+'
  } else if (type === 'bottom') {
    button.title = 'Delete column'
    button.textContent = '-'
  }
  return button
}

const pluginKey = new PluginKey('column-ctrl')

const findBottomCell = (pos) => {
  if (pos.node().type.name !== 'table_row') {
    return
  }

  let next = nextCell(pos, 'vert', 1)
  let prev = pos
  while (next != null) {
    prev = next
    next = nextCell(next, 'vert', 1)
  }

  return prev
}

export const cellMenu = new Plugin({
  key: pluginKey,
  state: {
    init() {
      return {
        currentCell: undefined,
      }
    },
    apply(tr, prev) {
      const state = tr.getMeta(this)
      return state ?? prev
    }
  },
  props: {
    decorations(state) {
      const pluginState = pluginKey.getState(state)
      const decos = []
      const cell = pluginState.currentCell

      try {
        if (cell) {
          const resolved = state.doc.resolve(cell)
          const bottomCell = findBottomCell(resolved)
          if (bottomCell) {
            decos.push(Decoration.widget(bottomCell.pos + 1, createMenu('bottom')))
            decos.push(Decoration.widget(cell + 1, createMenu('right')))
            decos.push(Decoration.widget(cell + 1, createMenu('left')))
          }
        }
      } catch (e) {
        // nextCell throws errors if undo removes a column
      }

      return DecorationSet.create(state.doc, decos)
    },
    handleDOMEvents: {
      mousemove(view, event) {
        const target = event.target as HTMLElement
        const pluginState = pluginKey.getState(view.state)
        if (pluginState.currentCell && !target.closest('table')) {
          const tr = view.state.tr
          tr.setMeta(pluginKey, {currentCell: undefined})
          view.dispatch(tr)
        }

        const pos = view.posAtCoords({left: event.x, top: event.y})
        if (!pos) return
        const resolved = view.state.doc.resolve(pos.pos)
        const cell = cellAround(resolved)
        if (!cell) return

        if (cell && pluginState.currentCell !== cell.pos) {
          const tr = view.state.tr
          tr.setMeta(pluginKey, {currentCell: cell.pos})
          view.dispatch(tr)
          return false
        }
      },
      mousedown: (view, event: MouseEvent) => {
        const target = event.target as Element
        const setCellSelection = (pos) => {
          const tr = view.state.tr
          tr.setSelection(new CellSelection(pos))
          view.dispatch(tr)
        }

        if (target.classList.contains('table-menu-right')) {
          const pluginState = pluginKey.getState(view.state)
          const pos = view.state.doc.resolve(pluginState.currentCell)
          setCellSelection(pos)
          addColumnAfter(view.state, view.dispatch)
          setTimeout(() => view.focus())
          return true
        } else if (target.classList.contains('table-menu-left')) {
          const pluginState = pluginKey.getState(view.state)
          const pos = view.state.doc.resolve(pluginState.currentCell)
          setCellSelection(pos)
          addColumnBefore(view.state, view.dispatch)
          setTimeout(() => view.focus())
          return true
        } else if (target.classList.contains('table-menu-bottom')) {
          const pluginState = pluginKey.getState(view.state)
          const pos = view.state.doc.resolve(pluginState.currentCell)
          const colCount = pos.node().childCount

          setCellSelection(pos)
          if (colCount === 1) {
            deleteTable(view.state, view.dispatch)
          } else {
            deleteColumn(view.state, view.dispatch)
          }

          setTimeout(() => view.focus())
          return true
        }
      }
    }
  }
})
