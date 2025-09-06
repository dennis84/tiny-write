import type {ReferenceElement} from '@floating-ui/dom'
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  CellSelection,
  deleteColumn,
  deleteRow,
  deleteTable,
  type TableMap,
  toggleHeaderRow,
} from 'prosemirror-tables'
import {createEffect, createSignal, Show} from 'solid-js'
import {useState} from '@/state'
import {
  IconAddColumnLeft,
  IconAddColumnRight,
  IconAddRowAbove,
  IconAddRowBelow,
  IconColumnRemove,
  IconRowRemove,
  IconToggleOn,
} from '../Icon'
import {Tooltip, TooltipButton, TooltipDivider} from '../Tooltip'
import type {ActiveHandle, CurrentCell, CurrentTable} from './TableControl'

interface Props {
  activeHandle: ActiveHandle
  currentCell: CurrentCell
  currentTable: CurrentTable
  currentTableMap: TableMap
  reset: () => void
}

export const TableTooltip = (props: Props) => {
  const {fileService} = useState()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<ReferenceElement | undefined>()

  const setCellSelection = () => {
    const editorView = fileService.currentFile?.editorView
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
    const editorView = fileService.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    toggleHeaderRow(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    props.reset()
    return true
  }

  const onAddRowAbove = () => {
    const editorView = fileService.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    addRowBefore(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    props.reset()
    return true
  }

  const onAddRowBelow = () => {
    const editorView = fileService.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    addRowAfter(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    props.reset()
    return true
  }

  const onAddColumnBefore = () => {
    const editorView = fileService.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    addColumnBefore(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    props.reset()
    return true
  }

  const onAddColumnAfter = () => {
    const editorView = fileService.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    addColumnAfter(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    props.reset()
    return true
  }

  const onRemoveColumn = () => {
    const editorView = fileService.currentFile?.editorView
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
    const editorView = fileService.currentFile?.editorView
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
    <Show when={tooltipAnchor()}>
      {(a) => (
        <Tooltip
          anchor={a()}
          onClose={props.reset}
          placement={props.activeHandle.direction === 'row' ? 'left' : 'top'}
          fallbackPlacements={
            props.activeHandle.direction === 'row'
              ? ['left', 'bottom', 'top']
              : ['top', 'left', 'right']
          }
        >
          <Show when={isFirstRow()}>
            <TooltipButton onMouseDown={onToggleHeaderRow}>
              <IconToggleOn /> Toggle table header row
            </TooltipButton>
            <TooltipDivider />
          </Show>
          <Show when={props.activeHandle.direction === 'row'}>
            <TooltipButton onMouseDown={onAddRowAbove}>
              <IconAddRowAbove /> Add row above
            </TooltipButton>
            <TooltipButton onMouseDown={onAddRowBelow}>
              <IconAddRowBelow /> Add row below
            </TooltipButton>
            <TooltipButton onMouseDown={onRemoveRow}>
              <IconRowRemove /> Remove row
            </TooltipButton>
          </Show>
          <Show when={props.activeHandle.direction === 'col'}>
            <TooltipButton onMouseDown={onAddColumnBefore}>
              <IconAddColumnLeft /> Add column before
            </TooltipButton>
            <TooltipButton onMouseDown={onAddColumnAfter}>
              <IconAddColumnRight /> Add column after
            </TooltipButton>
            <TooltipButton onMouseDown={onRemoveColumn}>
              <IconColumnRemove /> Remove column
            </TooltipButton>
          </Show>
        </Tooltip>
      )}
    </Show>
  )
}
