import {createEffect, createSignal, onCleanup, onMount, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {styled} from 'solid-styled-components'
import type {Node, ResolvedPos} from 'prosemirror-model'
import {cellAround, TableMap} from 'prosemirror-tables'
import {Box, type Vector} from '@flatten-js/core'
import {EdgeType, type File, useState} from '@/state'
import {ZIndex} from '@/utils/ZIndex'
import {BoxUtil} from '@/utils/BoxUtil'
import {IconDragIndicator} from '../Icon'
import {TableTooltip} from './TableTooltip'

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
    inset 0 0 0 20px var(--foreground-40);
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
  z-index: ${ZIndex.TABLE_SELECTION};
`

export interface CurrentTable {
  node: Node
  pos: number
}

export interface CurrentCell {
  element: HTMLElement
  pos: number
}

type Direction = 'vert' | 'horiz'

export interface ActiveHandle {
  element: Element
  direction: Direction
}

interface HandlePosition {
  vert: Vector
  horiz: Vector
}

interface HandleGridProps {
  file?: File
  currentTable: CurrentTable
  currentTableMap: TableMap
}

const HandleGrid = (props: HandleGridProps) => {
  const [currentCell, setCurrentCell] = createSignal<CurrentCell>()
  const [activeHandle, setActiveHandle] = createSignal<ActiveHandle>()
  const [handlePosition, setHandlePosition] = createSignal<HandlePosition>()
  const [selection, setSelection] = createSignal<Box>()
  const {appService} = useState()

  const hideHandles = () => {
    if (activeHandle()) return
    setCurrentCell(undefined)
    setHandlePosition(undefined)
    setSelection(undefined)
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

    const colBox = new Box(cellX, tableY, cellBox.width, tableBox.height)
    const rowBox = new Box(tableX, cellY, tableBox.width, cellBox.height)

    const vert = BoxUtil.getHandlePoint(colBox, EdgeType.Top)
    const horiz = BoxUtil.getHandlePoint(rowBox, EdgeType.Left)

    setHandlePosition({vert, horiz})
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
      direction === 'horiz'
        ? new Box(tableX, cellY, tableBox.width, cellBox.height)
        : new Box(cellX, tableY, cellBox.width, tableBox.height)
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

  const onHandleClick = (direction: Direction) => (e: MouseEvent) => {
    e.preventDefault()
    const cell = currentCell()
    if (!cell) return
    calcSelection(cell.element, direction)
    setActiveHandle({
      element: e.currentTarget as Element,
      direction,
    })
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

  return (
    <>
      <Show when={handlePosition()}>
        {(h) => (
          <>
            <Handle
              id="table-handle-horiz"
              style={{transform: `translate3d(${h().horiz.x}px, ${h().horiz.y}px, 0)`}}
              onMouseDown={onHandleClick('horiz')}
              class={activeHandle()?.direction === 'horiz' ? 'active' : ''}
            >
              <IconDragIndicator />
            </Handle>
            <Handle
              id="table-handle-vert"
              style={{transform: `translate3d(${h().vert.x}px, ${h().vert.y}px, 0) rotate(90deg)`}}
              onMouseDown={onHandleClick('vert')}
              class={activeHandle()?.direction === 'vert' ? 'active' : ''}
            >
              <IconDragIndicator />
            </Handle>
          </>
        )}
      </Show>
      <Show when={activeHandle()}>
        <Portal mount={appService.layoutRef}>
          <TableTooltip
            activeHandle={activeHandle()!}
            currentCell={currentCell()!}
            currentTable={props.currentTable}
            currentTableMap={props.currentTableMap}
            reset={onReset}
          />
        </Portal>
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
  const {store} = useState()
  const [table, setTable] = createSignal<CurrentTable | undefined>()

  createEffect(() => {
    const editorView = props.file?.editorView
    if (!editorView) return

    if (!store.lastTr) return
    if (!editorView.state.selection.empty) return

    const pos = editorView.state.selection.$from.before(1)
    const resolved = editorView.state.doc.resolve(pos + 1)
    const node = resolved.node()
    if (node.type.name === 'table') {
      setTable({pos, node})
    } else {
      setTable(undefined)
    }
  })

  return (
    <Show when={table()} keyed>
      {(t) => (
        <HandleGrid file={props.file} currentTable={t} currentTableMap={TableMap.get(t.node)} />
      )}
    </Show>
  )
}
