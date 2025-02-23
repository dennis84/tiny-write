import {JSX, onCleanup, onMount, splitProps} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {isTauri} from '@/env'
import {FULL_WIDTH} from './Layout'

const DrawerEl = styled('div')`
  position: relative;
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  display: flex;
  flex-direction: column;
  @media (max-width: ${FULL_WIDTH.toString()}px) {
    width: 100vw;
    ${isTauri() ? 'padding-top: 40px' : ''}
  }
  &::-webkit-scrollbar {
    display: none;
  }
`

const ResizeHandle = styled('div')`
  position: fixed;
  top: 0;
  bottom: 0;
  width: 15px;
  cursor: var(--cursor-grab);
  touch-action: none;
  z-index: 1;
  margin-left: -20px;
  &:hover {
    border-left: 2px solid var(--primary-background-50);
  }
  &:active {
    cursor: var(--cursor-grabbed);
  }
`

type Props = JSX.HTMLAttributes<HTMLDivElement> & {
  children: JSX.Element
  width?: string
  background?: number
  onResized?: (width: number) => void
}

export const Drawer = (props: Props) => {
  let resizeHandleRef!: HTMLDivElement
  let drawerRef!: HTMLDivElement

  const [local, rest] = splitProps(props, ['width', 'onResized', 'children', 'background'])

  onMount(() => {
    const gestrure = new DragGesture(resizeHandleRef, ({delta: [x]}) => {
      const w = drawerRef.offsetWidth - x
      resizeHandleRef.style.left = `${window.innerWidth - w + 20}px`
      local.onResized?.(w)
    })

    onCleanup(() => {
      gestrure.destroy()
    })
  })

  return (
    <DrawerEl
      {...rest}
      ref={drawerRef}
      data-tauri-drag-region="true"
      style={{
        width: local.width ?? '400px',
        background: `var(--foreground-${local.background ?? 5})`,
      }}
    >
      {local.children}
      <ResizeHandle ref={resizeHandleRef} />
    </DrawerEl>
  )
}
