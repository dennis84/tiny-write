import {JSX, onCleanup, onMount, splitProps} from 'solid-js'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {isTauri} from '@/env'
import {FULL_WIDTH} from './Layout'

const DrawerEl = styled('div')`
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
  position: absolute;
  top: 0;
  bottom: 0;
  cursor: var(--cursor-grab);
  touch-action: none;
  z-index: 1;
  padding: 0 20px;
  margin-left: -40px;
  display: flex;
  justify-content: center;
  > div {
    background: var(--primary-background-50);
    width: 2px;
    display: none;
  }
  &:hover div {
    display: block;
  }
  &:active {
    cursor: var(--cursor-grabbed);
    opacity: 0;
  }
`

type Props = JSX.HTMLAttributes<HTMLDivElement> & {
  children: JSX.Element
  ref?: () => HTMLDivElement
  width?: string
  background?: number
  onResized?: (width: number) => void
}

export const Drawer = (props: Props) => {
  let resizeHandleRef!: HTMLDivElement
  let ref!: HTMLDivElement

  const [local, rest] = splitProps(props, ['width', 'onResized', 'children', 'background'])

  onMount(() => {
    const gestrure = new DragGesture(resizeHandleRef, ({delta: [x]}) => {
      const w = ref.offsetWidth - x
      local.onResized?.(w)
    })

    onCleanup(() => {
      gestrure.destroy()
    })
  })

  return (
    <DrawerEl
      {...rest}
      ref={(el) => (ref = el) && props.ref?.(el)}
      data-tauri-drag-region="true"
      style={{
        width: local.width ?? '400px',
        background: `var(--foreground-${local.background ?? 5})`,
      }}
    >
      {local.children}
      <ResizeHandle ref={resizeHandleRef}>
        <div />
      </ResizeHandle>
    </DrawerEl>
  )
}
