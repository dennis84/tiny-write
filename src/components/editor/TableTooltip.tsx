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
import {Show} from 'solid-js'
import type {Dialog} from '@/services/DialogService'
import {useState} from '@/state'
import {TooltipButton, TooltipDivider} from '../dialog/Style'
import {
  IconAddColumnLeft,
  IconAddColumnRight,
  IconAddRowAbove,
  IconAddRowBelow,
  IconColumnRemove,
  IconRowRemove,
  IconToggleOn,
} from '../Icon'
import type {ActiveHandle, CurrentCell, CurrentTable} from './TableControl'

export interface TableTooltipState {
  activeHandle: ActiveHandle
  currentCell: CurrentCell
  currentTable: CurrentTable
  currentTableMap: TableMap
}

export const TableTooltip = (props: {dialog: Dialog<TableTooltipState>}) => {
  const {fileService, dialogService} = useState()

  const setCellSelection = () => {
    const editorView = fileService.currentFile?.editorView
    if (!editorView) return
    const tr = editorView.state.tr
    const p = editorView.state.doc.resolve(props.dialog.state.currentCell.pos)
    tr.setSelection(new CellSelection(p))
    editorView.dispatch(tr)
  }

  const isFirstRow = () => {
    const pos = props.dialog.state.currentCell.pos
    const offset = props.dialog.state.currentTable.pos
    const tableMap = props.dialog.state.currentTableMap
    const isFirst = pos >= tableMap.map[0] + offset && pos <= tableMap.map[tableMap.width] + offset
    return isFirst
  }

  const onToggleHeaderRow = () => {
    const editorView = fileService.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    toggleHeaderRow(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    dialogService.close(props.dialog)
    return true
  }

  const onAddRowAbove = () => {
    const editorView = fileService.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    addRowBefore(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    dialogService.close(props.dialog)
    return true
  }

  const onAddRowBelow = () => {
    const editorView = fileService.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    addRowAfter(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    dialogService.close(props.dialog)
    return true
  }

  const onAddColumnBefore = () => {
    const editorView = fileService.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    addColumnBefore(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    dialogService.close(props.dialog)
    return true
  }

  const onAddColumnAfter = () => {
    const editorView = fileService.currentFile?.editorView
    if (!editorView) return
    setCellSelection()
    addColumnAfter(editorView.state, editorView.dispatch)
    setTimeout(() => editorView.focus())
    dialogService.close(props.dialog)
    return true
  }

  const onRemoveColumn = () => {
    const editorView = fileService.currentFile?.editorView
    if (!editorView) return

    setCellSelection()
    if (props.dialog.state.currentTableMap.width <= 1) {
      deleteTable(editorView.state, editorView.dispatch)
    } else {
      deleteColumn(editorView.state, editorView.dispatch)
    }

    setTimeout(() => editorView.focus())
    dialogService.close(props.dialog)
    return true
  }

  const onRemoveRow = () => {
    const editorView = fileService.currentFile?.editorView
    if (!editorView) return

    setCellSelection()
    if (props.dialog.state.currentTableMap.height <= 1) {
      deleteTable(editorView.state, editorView.dispatch)
    } else {
      deleteRow(editorView.state, editorView.dispatch)
    }

    setTimeout(() => editorView.focus())
    dialogService.close(props.dialog)
    return true
  }

  return (
    <>
      <Show when={isFirstRow()}>
        <TooltipButton onMouseDown={onToggleHeaderRow}>
          <IconToggleOn /> Toggle table header row
        </TooltipButton>
        <TooltipDivider />
      </Show>
      <Show when={props.dialog.state.activeHandle.direction === 'row'}>
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
      <Show when={props.dialog.state.activeHandle.direction === 'col'}>
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
    </>
  )
}
