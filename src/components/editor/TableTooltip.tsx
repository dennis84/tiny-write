import {createEffect, onCleanup, onMount, Show} from 'solid-js'
import {createMutable, unwrap} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import {arrow, autoUpdate, computePosition, flip, offset, Placement, shift} from '@floating-ui/dom'
import {
  addColumnAfter,
  addColumnBefore,
  CellSelection,
  deleteColumn,
  deleteRow,
  deleteTable,
  TableMap,
  toggleHeaderRow,
} from 'prosemirror-tables'
import {Icon} from '../Icon'
import {CellState, SelectedHandle, TableState} from './TableControl'
import {useState} from '@/state'

const TooltipEl = styled('div')`
  position: absolute;
  z-index: var(--z-index-tooltip);
`

interface Cleanup {
  fn?: () => void
}

interface Props {
  selectedHandle: SelectedHandle
  cell: CellState
  table: TableState
  tableMap: TableMap
  reset: () => void
}

export const TableTooltip = (props: Props) => {
  let tooltipRef!: HTMLDivElement
  let arrowRef!: HTMLSpanElement
  const cleanup = createMutable<Cleanup>({})
  const [, ctrl] = useState()

  const onBackgroundClick = (e: MouseEvent) => {
    const block = props.selectedHandle
    if (!block) return

    if (tooltipRef.contains(e.target as Element)) return

    props.reset()
  }

  const setCellSelection = () => {
    const editorView = ctrl.file.currentFile?.editorView
    if (!editorView) return
    const tr = editorView.state.tr
    const p = editorView.state.doc.resolve(props.cell.pos - 1)
    tr.setSelection(new CellSelection(p))
    editorView.dispatch(tr)
  }

  const isFirstRow = () => {
    const pos = props.cell.pos
    const offset = props.table.pos
    const tableMap = props.tableMap
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
    if (props.tableMap.width <= 1) {
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
    if (props.tableMap.height <= 1) {
      deleteTable(editorView.state, editorView.dispatch)
    } else {
      deleteRow(editorView.state, editorView.dispatch)
    }

    setTimeout(() => editorView.focus())
    props.reset()
    return true
  }

  createEffect(() => {
    const result = props.selectedHandle

    const placement = result.direction === 'horiz' ? 'left' : 'top'
    const fallbackPlacements: Placement[] =
      result.direction === 'horiz' ? ['left', 'bottom', 'top'] : ['top', 'left', 'right']

    unwrap(cleanup).fn?.()
    cleanup.fn = autoUpdate(result.node, tooltipRef, async () => {
      return computePosition(result.node, tooltipRef, {
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
      </Show>
      <div onClick={onAddColumnBefore}>
        <Icon>add_column_left</Icon> Add column before
      </div>
      <div onClick={onAddColumnAfter}>
        <Icon>add_column_right</Icon> Add column after
      </div>
      <div onClick={onRemoveColumn}>
        <Icon>disabled_by_default</Icon> Remove column
      </div>
      <div onClick={onRemoveRow}>
        <Icon>variable_remove</Icon> Remove row
      </div>
      <span ref={arrowRef} class="arrow"></span>
    </TooltipEl>
  )
}
