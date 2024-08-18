import {File, useState} from '@/state'
import {createEffect, createSignal, onCleanup, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Node} from 'prosemirror-model'
import {TableMap} from 'prosemirror-tables'
import {Box, Vec} from '@tldraw/editor'
import {Icon} from '../Icon'
import {TableTooltip} from './TableTooltip'

const Handle = styled('div')`
  position: absolute;
  top: 0;
  left: 0;
  height: 26px;
  width: 4px;
  z-index: var(--z-index-handle);
  background: var(--foreground);
  box-shadow: 0 0 0 2px var(--background);
  color: var(--background);
  margin-left: -2px;
  margin-top: -13px;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: var(--cursor-pointer);
  user-select: none;
  > span {
    display: none;
    font-size: 14px;
  }
  &:hover,
  &.active {
    width: 16px;
    margin-left: -8px;
    border-radius: var(--border-radius);
    background: var(--primary-background);
    > span {
      display: block;
      color: var(--primary-foreground);
    }
  }
`

export interface TableState {
  node: Node
  pos: number
}

interface HandleGridProps {
  file?: File
  table: TableState
  tableMap: TableMap
}

export interface CellState {
  v: Vec
  h: Vec
  node: HTMLElement
  pos: number
}

type Direction = 'vert' | 'horiz'

export interface SelectedHandle {
  node: Element
  direction: Direction
  first: boolean
}

const HandleGrid = (props: HandleGridProps) => {
  const [cell, setCell] = createSignal<CellState | undefined>()
  const [selectedHandle, setSelectedHandle] = createSignal<SelectedHandle>()
  const [selection, setSelection] = createSignal()

  const hideHandles = () => {
    if (selectedHandle()) return
    setCell(undefined)
  }

  const onReset = () => {
    setSelectedHandle(undefined)
    hideHandles()
  }

  const calcCell = (node: HTMLElement, pos: number) => {
    const tableNode = node.parentNode?.parentNode as HTMLElement
    const tableBox = tableNode.getBoundingClientRect()
    const cellBox = node.getBoundingClientRect()
    const colBox = new Box(cellBox.x, tableBox.y, cellBox.width, tableBox.height)
    const rowBox = new Box(tableBox.x, cellBox.y, tableBox.width, cellBox.height)
    const v = colBox.getHandlePoint('top')
    const h = rowBox.getHandlePoint('left')
    setCell({v, h, node, pos})
  }

  const onMouseMove = (e: MouseEvent) => {
    if (selectedHandle()) return
    const editorView = props.file?.editorView
    if (!editorView) return

    const coords = {left: e.clientX, top: e.clientY}
    const pos = editorView.posAtCoords(coords)
    if (!pos) return

    const cellDom = editorView.domAtPos(pos.pos)
    if (!cellDom) return hideHandles()

    let cellNode = cellDom.node as HTMLElement
    while (cellNode && cellNode?.parentNode?.nodeName !== 'TR') {
      cellNode = cellNode?.parentNode as HTMLElement
    }

    if (!cellNode) return hideHandles()

    calcCell(cellNode, pos.pos)
  }

  const onWheel = () => {
    const c = cell()
    if (!c) return
    calcCell(c.node, c.pos)
  }

  const onHandleClick = (direction: Direction) => (e: MouseEvent) => {
    const c = cell()
    setSelectedHandle({
      node: e.currentTarget as Element,
      direction,
      first: c?.node.nodeName === 'TH',
    })
  }

  onMount(() => {
    const editorView = props.file?.editorView
    if (!editorView) return

    const dom = editorView.domAtPos(props.table.pos + 1)
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
      <Show when={cell()}>
        {(c) => (
          <>
            <Handle
              style={{transform: `translate3d(${c().h.x}px, ${c().h.y}px, 0)`}}
              onClick={onHandleClick('horiz')}
              class={selectedHandle()?.direction === 'horiz' ? 'active' : ''}
            >
              <Icon>drag_indicator</Icon>
            </Handle>
            <Handle
              style={{transform: `translate3d(${c().v.x}px, ${c().v.y}px, 0) rotate(90deg)`}}
              onClick={onHandleClick('vert')}
              class={selectedHandle()?.direction === 'vert' ? 'active' : ''}
            >
              <Icon>drag_indicator</Icon>
            </Handle>
            <Show when={selectedHandle() && cell()}>
              <TableTooltip
                selectedHandle={selectedHandle()!}
                cell={cell()!}
                table={props.table}
                tableMap={props.tableMap}
                reset={onReset} />
            </Show>
          </>
        )}
      </Show>
    </>
  )
}

interface Props {
  file?: File
  scrollContainer?: () => HTMLElement
}

export const TableControls = (props: Props) => {
  const [state] = useState()
  const [table, setTable] = createSignal<TableState | undefined>()

  createEffect(() => {
    const editorView = props.file?.editorView
    if (!editorView) return

    if (!state.lastTr) return
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
    <Show when={table()}>
      {(t) => <HandleGrid file={props.file} table={t()} tableMap={TableMap.get(t().node)} />}
    </Show>
  )
}
