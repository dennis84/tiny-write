import {DragGesture} from '@use-gesture/vanilla'
import {type JSX, onCleanup, onMount, splitProps} from 'solid-js'
import {styled} from 'solid-styled-components'
import {isTauri} from '@/env'
import {FULL_WIDTH, Scroll} from './Layout'

// biome-ignore format: ternary breaks ugly
const DrawerContainer = styled.div<{left?: boolean}>`
  flex-grow: 0; /* fixed width that the user has dragged in flex layout */
  flex-shrink: 0;
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  ${(p) => p.left ? `
    border-right: 1px solid var(--background-80);
  ` : `
    border-left: 1px solid var(--background-80);
  `}
  background: var(--background-95);
  @media (max-width: ${FULL_WIDTH.toString()}px) {
    width: 100vw;
    ${isTauri() ? 'padding-top: 40px' : ''}
  }
  &::-webkit-scrollbar {
    display: none;
  }
`

export const DrawerScroll = styled(Scroll)`
  &::before {
    background-image: linear-gradient(
      to bottom,
      var(--background-95) 0%,
      var(--background-95) 50%, /* extra space for navbar */
      var(--background-0)
    );
  }
  &::after {
    background-image: linear-gradient(
      to top,
      var(--background-95),
      var(--background-0)
    );
  }
`

export const DrawerContent = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  width: 100%;
`

// biome-ignore format: ternary breaks ugly
const ResizeHandle = styled.div<{left?: boolean}>`
  position: absolute;
  top: 0;
  bottom: 0;
  ${(p) => p.left ? `
    right: 0;
    margin-left: 0;
    margin-right: -20px;
  ` : ``}
  cursor: var(--cursor-grab);
  touch-action: none;
  z-index: var(--z-index-dialog);
  padding: 0 20px;
  margin-left: -20px;
  display: flex;
  justify-content: center;
  > div {
    background: var(--primary-background);
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
  left?: boolean
  onResized?: (width: number) => void
}

export const Drawer = (props: Props) => {
  let resizeHandleRef!: HTMLDivElement
  let ref!: HTMLDivElement

  const [local, rest] = splitProps(props, ['width', 'onResized', 'children', 'left'])

  onMount(() => {
    const gestrure = new DragGesture(resizeHandleRef, ({delta: [x]}) => {
      const w = ref.offsetWidth + x * (props.left ? 1 : -1)
      local.onResized?.(w)
    })

    onCleanup(() => {
      gestrure.destroy()
    })
  })

  return (
    <DrawerContainer
      {...rest}
      ref={(el) => (ref = el) && props.ref?.(el)}
      left={props.left}
      data-tauri-drag-region="true"
      style={{width: local.width ?? '400px'}}
    >
      {local.children}
      <ResizeHandle ref={resizeHandleRef} left={props.left}>
        <div />
      </ResizeHandle>
    </DrawerContainer>
  )
}
