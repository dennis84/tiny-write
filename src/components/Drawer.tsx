import {DragGesture} from '@use-gesture/vanilla'
import {type JSX, onCleanup, onMount, splitProps} from 'solid-js'
import {styled} from 'solid-styled-components'
import {isTauri} from '@/env'
import {FULL_WIDTH} from './Layout'

const DrawerContainer = styled('div')`
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--foreground-20);
  background: var(--foreground-5);
  @media (max-width: ${FULL_WIDTH.toString()}px) {
    width: 100vw;
    ${isTauri() ? 'padding-top: 40px' : ''}
  }
  &::-webkit-scrollbar {
    display: none;
  }
`

export const DrawerContent = styled('div')`
  padding: 20px;
  display: flex;
  flex-direction: column;
  width: 100%;
`

const ResizeHandle = styled('div')`
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
