import {createEffect, createSignal, For, onCleanup} from 'solid-js'
import {createStore} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import type {Awareness} from 'y-protocols/awareness'
import {throttle} from 'throttle-debounce'
import {Page, useState} from '@/state'

const CursorContainer = styled('div')`
  position: fixed;
  top: 0;
  left: 0;
  contain: layout style size;
  width: 1px;
  height: 1px;
`

const Cursor = styled('div')`
  position: absolute;
  top: ${(props: any) => props.y}px;
  left: ${(props: any) => props.x}px;
  height: 10px;
  margin-left: -15px;
  z-index: 20;
  pointer-events: none;
  user-select: none;
  span {
    position: absolute;
    display: inline-flex;
    align-items: center;
    height: 20px;
    top: 20px;
    right: 0;
    line-height: 0;
    white-space: nowrap;
    padding: 4px;
    color: ${(props: any) => props.foreground};
    background: ${(props: any) => props.background};
    font-family: var(--menu-font-family);
    font-size: var(--menu-font-size);
    border-radius: var(--border-radius);
  }
  &::before,
  &::after {
    content: "";
    transform: rotate(148deg);
    position: absolute;
    width: 10px;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid ${(props: any) => props.background};
  }
  &::before {
    transform: rotate(148deg);
    left: 0;
  }
  &::after {
    transform: rotate(-77deg);
    left: -1px;
    top: -1px;
  }
`

interface Cursor {
  id: number
  username: string
  x: number
  y: number
  background: string
  foreground: string
}

export const MouseCursor = () => {
  const {store, canvasService, fileService} = useState()
  const [awareness, setAwareness] = createSignal<Awareness>()
  const [cursors, setCursors] = createStore<Cursor[]>([])
  const [offset, setOffset] = createSignal<[number, number]>([0, 0])

  const zoom = () =>
    store.lastLocation?.page === Page.Canvas ? (canvasService.currentCanvas?.camera.zoom ?? 1) : 1

  createEffect(() => {
    if (store.config.contentWidth === undefined) return

    if (store.lastLocation?.page === Page.Canvas) {
      setOffset(canvasService.currentCanvas?.camera.point ?? [0, 0])
      return
    }

    const rect = fileService.currentFile?.editorView?.dom.getBoundingClientRect()
    setOffset([rect?.left ?? 0, rect?.top ?? 0])
  })

  const onAwarenessChange = ({added, updated, removed}: any) => {
    const y = store.collab?.ydoc

    if (!y) return

    removed.forEach((id: number) => {
      setCursors((prev) => prev.filter((c) => c.id !== id))
    })

    added.concat(updated).forEach((id: number) => {
      const aw = awareness()?.states.get(id)
      if (id === y.clientID || !aw?.mouse) return
      const mouse = cursors.find((c) => c.id === id)

      if (mouse) {
        const x = aw.mouse.x
        const y = aw.mouse.y
        setCursors(
          (c) => c.id === id,
          (prev) => ({...prev, x, y}),
        )
      } else {
        const x = aw.mouse.x
        const y = aw.mouse.y

        const username = aw.user.name
        const cursor = {
          id,
          username,
          x,
          y,
          background: aw.user.background,
          foreground: aw.user.foreground,
        }

        setCursors((prev) => [...prev, cursor])
      }
    })
  }

  const onMouseMove = throttle(20, (e: MouseEvent) => {
    if ((awareness()?.states.size ?? 0) <= 1) return
    const [offsetX, offsetY] = offset()
    const x = e.x / zoom() - offsetX
    const y = e.y / zoom() - offsetY
    awareness()?.setLocalStateField('mouse', {x, y})
  })

  createEffect(() => {
    if (store.collab?.started !== true) return
    const aw = store.collab?.provider?.awareness
    if (!aw) return
    setAwareness(aw)
    aw.on('change', onAwarenessChange)
    document.addEventListener('mousemove', onMouseMove)

    onCleanup(() => {
      document.removeEventListener('mousemove', onMouseMove)
      aw.off('change', onAwarenessChange)
      aw.setLocalStateField('mouse', null)
      setAwareness(undefined)
      setCursors([])
    })
  })

  return (
    <CursorContainer
      style={{
        transform: `
          scale(${zoom()})
          translate(${offset()
            .map((n) => `${n}px`)
            .join(',')})
        `,
      }}
    >
      <For each={cursors}>
        {(cursor) => (
          <Cursor
            x={cursor.x}
            y={cursor.y}
            background={cursor.background}
            foreground={cursor.foreground}
          >
            <span>{cursor.username}</span>
          </Cursor>
        )}
      </For>
    </CursorContainer>
  )
}
