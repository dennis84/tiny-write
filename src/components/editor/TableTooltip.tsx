import {createEffect, onCleanup, onMount, Show} from 'solid-js'
import {createMutable, unwrap} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import {arrow, autoUpdate, computePosition, flip, offset, Placement, shift} from '@floating-ui/dom'
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

const TooltipEl = styled('div')`
  position: absolute;
  z-index: var(--z-index-tooltip);
`

interface Cleanup {
  fn?: () => void
}

interface Props {
  activeHandle: ActiveHandle
  currentCell: CurrentCell
  currentTable: CurrentTable
  currentTableMap: TableMap
  reset: () => void
}

export const TableTooltip = (props: Props) => {
  let tooltipRef!: HTMLDivElement
  let arrowRef!: HTMLSpanElement
  const cleanup = createMutable<Cleanup>({})
  const [, ctrl] = useState()

  const onBackgroundClick = (e: MouseEvent) => {
    const block = props.activeHandle
    if (!block) return

    if (tooltipRef.contains(e.target as Element)) return

    props.reset()
  }

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

    const placement = result.direction === 'horiz' ? 'left' : 'top'
    const fallbackPlacements: Placement[] =
      result.direction === 'horiz' ? ['left', 'bottom', 'top'] : ['top', 'left', 'right']

    unwrap(cleanup).fn?.()
    cleanup.fn = autoUpdate(result.element, tooltipRef, async () => {
      return computePosition(result.element, tooltipRef, {
        placement,
        middleware: [offset(10), flip({fallbackPlacements}), shift(), arrow({element: arrowRef})],
      }).then(({x, y, placement, middlewareData}) => {
        tooltipRef.style.left = `${x}px`
        tooltipRef.style.top = `${y}px`
        const side = placement.split('-')[0]
        const staticSide =
          {
            top: 'bottom',
            right: 'left',
            bottom: 'top',
            left: 'right',
          }[side] ?? 'top'

        if (middlewareData.arrow) {
          const {x, y} = middlewareData.arrow
          arrowRef.classList.add(staticSide)
          Object.assign(arrowRef.style, {
            left: x != null ? `${x}px` : '',
            top: y != null ? `${y}px` : '',
            [staticSide]: `${-arrowRef.offsetWidth / 2}px`,
          })
        }
      })
    })
  })

  onMount(() => {
    document.addEventListener('mousedown', onBackgroundClick)
  })

  onCleanup(() => {
    cleanup.fn?.()
    document.removeEventListener('mousedown', onBackgroundClick)
  })

  return (
    <TooltipEl ref={tooltipRef} id="table-tooltip" class="table-tooltip">
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
          <IconColumnRemove/> Remove column
        </div>
      </Show>
      <span ref={arrowRef} class="arrow"></span>
    </TooltipEl>
  )
}
