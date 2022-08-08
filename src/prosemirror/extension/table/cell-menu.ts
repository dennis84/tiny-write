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
    apply(tr) {
      const state = tr.getMeta(this)
      return state ?? {currentCell: undefined}
    }
  },
  props: {
    decorations(state) {
      const pluginState = pluginKey.getState(state)
      const decos = []
      const cell = pluginState.currentCell

      if (cell) {
        const bottomCell = findBottomCell(cell)
        decos.push(Decoration.widget(bottomCell.pos + 1, createMenu('bottom')))
        decos.push(Decoration.widget(cell.pos + 1, createMenu('right')))
        decos.push(Decoration.widget(cell.pos + 1, createMenu('left')))
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

        if (cell) {
          const tr = view.state.tr
          tr.setMeta(pluginKey, {currentCell: cell})
          view.dispatch(tr)
          return false
        }
      },
      mousedown: (view, event: MouseEvent) => {
        const target = event.target as Element
        if (target.classList.contains('table-menu-right')) {
          const pluginState = pluginKey.getState(view.state)
          const tr = view.state.tr
          tr.setSelection(new CellSelection(pluginState.currentCell))
          view.dispatch(tr)
          addColumnAfter(view.state, view.dispatch)
          return true
        } else if (target.classList.contains('table-menu-left')) {
          const pluginState = pluginKey.getState(view.state)
          const tr = view.state.tr
          tr.setSelection(new CellSelection(pluginState.currentCell))
          view.dispatch(tr)
          addColumnBefore(view.state, view.dispatch)
          return true
        } else if (target.classList.contains('table-menu-bottom')) {
          const pluginState = pluginKey.getState(view.state)
          const tr = view.state.tr
          tr.setSelection(new CellSelection(pluginState.currentCell))
          view.dispatch(tr)

          const colCount = pluginState.currentCell.node().childCount
          if (colCount === 1) {
            deleteTable(view.state, view.dispatch)
          } else {
            deleteColumn(view.state, view.dispatch)
          }

          return true
        }
      }
    }
  }
})
