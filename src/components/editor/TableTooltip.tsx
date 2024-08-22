import {createEffect, createSignal, Show} from 'solid-js'
import {ReferenceElement} from '@floating-ui/dom'
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  CellSelection,
  deleteColumn,
  deleteRow,
  deleteTable,
  TableMap,
  toggleHeaderRow,
} from 'prosemirror-tables'
import {Icon, IconColumnRemove, IconRowRemove} from '../Icon'
import {CurrentCell, ActiveHandle, CurrentTable} from './TableControl'
import {useState} from '@/state'
import {Tooltip} from '../Tooltip'

interface Props {
  activeHandle: ActiveHandle
  currentCell: CurrentCell
  currentTable: CurrentTable
  currentTableMap: TableMap
  reset: () => void
}

export const TableTooltip = (props: Props) => {
  const [, ctrl] = useState()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<ReferenceElement | undefined>()

  const setCellSelection = () => {
    const editorView = ctrl.file.currentFile?.editorView
    if (!editorView) return
    const tr = editorView.state.tr
    const p = editorView.state.doc.resolve(props.currentCell.pos)
    tr.setSelection(new CellSelection(p))
    editorView.dispatch(tr)
  }

  const isFirstRow = () => {
    const pos = props.currentCell.pos
    const offset = props.currentTable.pos
    const tableMap = props.currentTableMap
    const isFirst = pos >= tableMap.map[0] + offset && pos <= tableMap.map[tableMap.width] + offset
    return isFirst
  }

  const onToggleHeaderRow = () => {
    const editorView = ctrl.file.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    toggleHeaderRow(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    props.reset()
    return true
  }

  const onAddRowAbove = () => {
    const editorView = ctrl.file.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    addRowBefore(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    props.reset()
    return true
  }

  const onAddRowBelow = () => {
    const editorView = ctrl.file.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    addRowAfter(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    props.reset()
    return true
  }

  const onAddColumnBefore = () => {
    const editorView = ctrl.file.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    addColumnBefore(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    props.reset()
    return true
  }

  const onAddColumnAfter = () => {
    const editorView = ctrl.file.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    addColumnAfter(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    props.reset()
    return true
  }

  const onRemoveColumn = () => {
    const editorView = ctrl.file.currentFile?.editorView
    if (!editorView) return

    setCellSelection()
    if (props.currentTableMap.width <= 1) {
      deleteTable(editorView.state, editorView.dispatch)
    } else {
      deleteColumn(editorView.state, editorView.dispatch)
    }

    setTimeout(() => editorView.focus())
    props.reset()
    return true
  }

  const onRemoveRow = () => {
    const editorView = ctrl.file.currentFile?.editorView
    if (!editorView) return

    setCellSelection()
    if (props.currentTableMap.height <= 1) {
      deleteTable(editorView.state, editorView.dispatch)
    } else {
      deleteRow(editorView.state, editorView.dispatch)
    }

    setTimeout(() => editorView.focus())
    props.reset()
    return true
  }

  createEffect(() => {
    const result = props.activeHandle
    setTooltipAnchor(result.element)
  })

  return (
    <Tooltip
      anchor={tooltipAnchor()!}
      onClose={props.reset}
      placement={props.activeHandle.direction === 'horiz' ? 'left' : 'top'}
      fallbackPlacements={
        props.activeHandle.direction === 'horiz' ?
          ['left', 'bottom', 'top']
        : ['top', 'left', 'right']
      }
    >
      <Show when={isFirstRow()}>
        <div onClick={onToggleHeaderRow}>
          <Icon>toggle_on</Icon> Toggle table header row
        </div>
        <hr class="divider" />
      </Show>
      <Show when={props.activeHandle.direction === 'horiz'}>
        <div onClick={onAddRowAbove}>
          <Icon>add_row_above</Icon> Add row above
        </div>
        <div onClick={onAddRowBelow}>
          <Icon>add_row_below</Icon> Add row below
        </div>
        <div onClick={onRemoveRow}>
          <IconRowRemove /> Remove row
        </div>
      </Show>
      <Show when={props.activeHandle.direction === 'vert'}>
        <div onClick={onAddColumnBefore}>
          <Icon>add_column_left</Icon> Add column before
        </div>
        <div onClick={onAddColumnAfter}>
          <Icon>add_column_right</Icon> Add column after
        </div>
        <div onClick={onRemoveColumn}>
          <IconColumnRemove /> Remove column
        </div>
      </Show>
    </Tooltip>
  )
}
