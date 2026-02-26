import {DragGesture} from '@use-gesture/vanilla'
import {type JSX, onCleanup, onMount, splitProps} from 'solid-js'
import {styled} from 'solid-styled-components'
import {isTauri} from '@/env'
import {FULL_WIDTH, Scroll} from './Layout'

const DrawerContainer = styled.div`
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--background-80);
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

const ResizeHandle = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  cursor: var(--cursor-grab);
  touch-action: none;
  z-index: 1;
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
  onResized?: (width: number) => void
}

export const Drawer = (props: Props) => {
  let resizeHandleRef!: HTMLDivElement
  let ref!: HTMLDivElement

  const [local, rest] = splitProps(props, ['width', 'onResized', 'children'])

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
    <DrawerContainer
      {...rest}
      ref={(el) => (ref = el) && props.ref?.(el)}
      data-tauri-drag-region="true"
      style={{width: local.width ?? '400px'}}
    >
      {local.children}
      <ResizeHandle ref={resizeHandleRef}>
        <div />
      </ResizeHandle>
    </DrawerContainer>
  )
}
