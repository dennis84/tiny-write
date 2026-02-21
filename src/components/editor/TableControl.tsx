import type {Box, Vector} from '@flatten-js/core'
import {throttle} from '@solid-primitives/scheduled'
import type {Node, ResolvedPos} from 'prosemirror-model'
import {cellAround, TableMap} from 'prosemirror-tables'
import {createEffect, createSignal, onCleanup, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import {EdgeType, type File} from '@/types'
import {BoxUtil} from '@/utils/BoxUtil'
import {IconDragIndicator} from '../Icon'
import {TableTooltip, type TableTooltipState} from './TableTooltip'

const Handle = styled('div')`
  position: absolute;
  top: 0;
  left: 0;
  height: 26px;
  width: 4px;
  z-index: var(--z-index-handle);
  background: var(--background);
  box-shadow:
    0 0 0 2px var(--background),
    inset 0 0 0 20px var(--background-60);
  color: var(--background);
  margin-left: -2px;
  margin-top: -13px;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: var(--cursor-pointer);
  user-select: none;
  > .icon {
    display: none;
    font-size: 14px;
  }
  &:hover,
  &.active {
    width: 16px;
    margin-left: -8px;
    border-radius: var(--border-radius);
    background: var(--primary-background);
    box-shadow: 0 0 0 2px var(--background);
    > .icon {
      display: block;
      color: var(--primary-foreground);
    }
  }
`

const Selection = styled('div')`
  position: absolute;
  border: 1px solid var(--primary-background);
  box-shadow: 0 0 0 1px var(--primary-background);
  user-select: none;
  pointer-events: none;
  z-index: var(--z-index-above-content);
`

export interface CurrentTable {
  node: Node
  pos: number
}

export interface CurrentCell {
  element: HTMLElement
  pos: number
}

type Direction = 'col' | 'row'

export interface ActiveHandle {
  element: Element
  direction: Direction
}

interface HandlePosition {
  col: Vector // position for column handle
  row: Vector // position for row handle
}

interface HandleGridProps {
  file?: File
  currentTable: CurrentTable
  currentTableMap: TableMap
  onActive?: (status: boolean) => void
}

const HandleGrid = (props: HandleGridProps) => {
  const [currentCell, setCurrentCell] = createSignal<CurrentCell>()
  const [activeHandle, setActiveHandle] = createSignal<ActiveHandle>()
  const [handlePosition, setHandlePosition] = createSignal<HandlePosition>()
  const [selection, setSelection] = createSignal<Box>()

  const hideHandles = () => {
    if (activeHandle()) return
    setCurrentCell(undefined)
    setHandlePosition(undefined)
    setSelection(undefined)
    props.onActive?.(false)
  }

  const onReset = () => {
    setActiveHandle(undefined)
    hideHandles()
  }

  const getCellPos = ([x, y]: [number, number]): ResolvedPos | undefined => {
    const editorView = props.file?.editorView
    if (!editorView) return

    const coords = {left: x, top: y}
    const pos = editorView.posAtCoords(coords)
    if (!pos) return

    const resolved = editorView.state.doc.resolve(pos.pos)
    return cellAround(resolved) ?? undefined
  }

  const calcHandlePosition = (element: HTMLElement, pos: number) => {
    const editorView = props.file?.editorView
    if (!editorView) return

    const tableNode = element.parentNode?.parentNode as HTMLElement
    const tableBox = tableNode.getBoundingClientRect()
    const cellBox = element.getBoundingClientRect()

    const cellX = editorView.dom.offsetLeft + element.offsetLeft
    const cellY = editorView.dom.offsetTop + element.offsetTop
    const tableX = editorView.dom.offsetLeft + tableNode.offsetLeft
    const tableY = editorView.dom.offsetTop + tableNode.offsetTop

    const colBox = BoxUtil.fromRect({
      x: cellX,
      y: tableY,
      width: cellBox.width,
      height: tableBox.height,
    })

    const rowBox = BoxUtil.fromRect({
      x: tableX,
      y: cellY,
      width: tableBox.width,
      height: cellBox.height,
    })

    const col = BoxUtil.getHandlePoint(colBox, EdgeType.Top)
    const row = BoxUtil.getHandlePoint(rowBox, EdgeType.Left)

    setHandlePosition({col, row})
    setCurrentCell({element, pos})
  }

  const onMouseMove = (e: MouseEvent) => {
    if (activeHandle()) return
    const editorView = props.file?.editorView
    if (!editorView) return

    const pos = getCellPos([e.clientX, e.clientY])
    if (!pos) return
    const dom = editorView.domAtPos(pos.pos + 1)

    if (!dom.node) return hideHandles()
    calcHandlePosition(dom.node as HTMLElement, pos.pos)
  }

  const calcSelection = (element: HTMLElement, direction: Direction) => {
    const editorView = props.file?.editorView
    if (!editorView) return

    const tableNode = element.parentNode?.parentNode as HTMLElement
    const tableBox = tableNode.getBoundingClientRect()
    const cellBox = element.getBoundingClientRect()

    const cellX = editorView.dom.offsetLeft + element.offsetLeft
    const cellY = editorView.dom.offsetTop + element.offsetTop
    const tableX = editorView.dom.offsetLeft + tableNode.offsetLeft
    const tableY = editorView.dom.offsetTop + tableNode.offsetTop

    const box =
      direction === 'row'
        ? BoxUtil.fromRect({x: tableX, y: cellY, width: tableBox.width, height: cellBox.height})
        : BoxUtil.fromRect({x: cellX, y: tableY, width: cellBox.width, height: tableBox.height})
    setSelection(box)
  }

  const onWheel = () => {
    const cell = currentCell()
    if (!cell) return
    calcHandlePosition(cell.element, cell.pos)

    const handle = activeHandle()
    if (!handle) return
    calcSelection(cell.element, handle.direction)
  }

  const handleClick = (e: MouseEvent, direction: Direction) => {
    e.preventDefault()
    const cell = currentCell()
    if (!cell) return
    calcSelection(cell.element, direction)
    setActiveHandle({
      element: e.currentTarget as Element,
      direction,
    })
    props.onActive?.(true)
  }

  onMount(() => {
    const editorView = props.file?.editorView
    if (!editorView) return

    const dom = editorView.domAtPos(props.currentTable.pos + 1)
    if (!dom) return

    const node = dom.node as HTMLElement
    node.addEventListener('mousemove', onMouseMove)
    window.addEventListener('wheel', onWheel)

    onCleanup(() => {
      node.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('wheel', onWheel)
    })
  })

  createEffect(() => {
    const handle = activeHandle()
    const cell = currentCell()
    if (handle && cell) {
      showTooltip({
        anchor: handle.element,
        placement: handle.direction === 'row' ? 'left' : 'top',
        fallbackPlacements:
          handle.direction === 'row' ? ['left', 'bottom', 'top'] : ['top', 'left', 'right'],
        state: {
          activeHandle: handle,
          currentCell: cell,
          currentTableMap: props.currentTableMap,
          currentTable: props.currentTable,
        },
      })
    } else {
      closeTooltip()
    }
  })

  const [showTooltip, closeTooltip] = useDialog<TableTooltipState>({
    component: TableTooltip,
    onClose: () => onReset(),
  })

  return (
    <>
      <Show when={handlePosition()}>
        {(h) => (
          <>
            <Handle
              id="table-handle-row"
              style={{transform: `translate3d(${h().row.x}px, ${h().row.y}px, 0)`}}
              onMouseDown={(e) => handleClick(e, 'row')}
              class={activeHandle()?.direction === 'row' ? 'active' : ''}
            >
              <IconDragIndicator />
            </Handle>
            <Handle
              id="table-handle-col"
              style={{transform: `translate3d(${h().col.x}px, ${h().col.y}px, 0) rotate(90deg)`}}
              onMouseDown={(e) => handleClick(e, 'col')}
              class={activeHandle()?.direction === 'col' ? 'active' : ''}
            >
              <IconDragIndicator />
            </Handle>
          </>
        )}
      </Show>
      <Show when={selection()}>
        {(s) => (
          <Selection
            style={{
              width: `${s().width}px`,
              height: `${s().height}px`,
              left: `${s().xmin}px`,
              top: `${s().ymin}px`,
            }}
          />
        )}
      </Show>
    </>
  )
}

interface Props {
  file?: File
}

export const TableControls = (props: Props) => {
  const [table, setTable] = createSignal<CurrentTable | undefined>()
  const [menuActive, setMenuActive] = createSignal(false)

  const onMouseMove = throttle((e: MouseEvent) => {
    if (menuActive()) return

    const editorView = props.file?.editorView
    if (!editorView) return

    const mousePos = editorView.posAtCoords({left: e.clientX, top: e.clientY})
    if (!mousePos) return
    const resolved = editorView.state.doc.resolve(mousePos.pos)
    const node = resolved.node(1)
    const pos = resolved.before(1)

    if (node?.type.name === 'table') {
      setTable({pos, node})
    } else {
      setTable(undefined)
    }
  }, 500)

  onMount(() => {
    document.addEventListener('mousemove', onMouseMove, {passive: true})

    onCleanup(() => {
      document.removeEventListener('mousemove', onMouseMove)
    })
  })

  return (
    <Show when={table()}>
      {(t) => (
        <HandleGrid
          file={props.file}
          currentTable={t()}
          currentTableMap={TableMap.get(t().node)}
          onActive={(status) => setMenuActive(status)}
        />
      )}
    </Show>
  )
}
