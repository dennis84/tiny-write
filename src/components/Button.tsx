import {createSignal, For, JSX, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'

export const Common = `
  height: 40px;
  padding: 0 20px;
  border-radius: 30px;
  font-size: var(--menu-font-size);
  cursor: var(--cursor-pointer);
  display: inline-flex;
  justify-content: center;
  align-items: center;
  outline: none;
  text-decoration: none;
  font-family: var(--menu-font-family);
  border: 0;
  &[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .icon {
    margin-right: 5px;
    margin-top: 1px;
    margin-left: -5px;
  }
`

const RippleEffect = `
  position: relative;
  overflow: hidden;
  .ripple {
    position: absolute;
    border-radius: 50%;
    transform: scale(0);
    animation: ripple-animation 400ms linear;
    background-color: rgba(255, 255, 255, 0.4);
  }
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`

export const ButtonEl = styled('button')`
  ${Common}
  ${RippleEffect}
  background: var(--background-60);
  color: var(--foreground);
  &:hover {
    color: var(--primary-background);
    background: var(--foreground-10);
  }
`

const ButtonPrimaryEl = styled('button')`
  ${Common}
  ${RippleEffect}
  color: var(--primary-foreground);
  border: 0;
  background: var(--primary-background);
  &:hover {
    background: var(--primary-background-80);
  }
`

export const ButtonGroup = styled('div')`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

export const IconButtonEl = styled('button')`
  ${Common}
  ${RippleEffect}
  width: 40px;
  padding: 0;
  background: none;
  color: var(--foreground);
  &:hover {
    background: var(--foreground-10);
    color: var(--primary-background);
  }
  .icon {
    margin: 0;
  }
`

interface Ripple {
  x: number
  y: number
  size: number
}

const Ripples = () => {
  const [ripples, setRipples] = createSignal<Ripple[]>([])
  let ref!: HTMLSpanElement

  const onClick = (e: MouseEvent) => {
    const button = e.currentTarget as Element
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    const newRipple = {x, y, size}

    setRipples((prev) => [...prev, newRipple])

    setTimeout(() => {
      setRipples((prev) => prev.slice(1))
    }, 600)
  }

  onMount(() => {
    let parentNode = ref.parentNode as HTMLElement | null
    parentNode?.addEventListener('click', onClick)
    onCleanup(() => {
      parentNode?.removeEventListener('click', onClick)
    })
  })

  return (
    <span ref={ref}>
      <For each={ripples()}>
        {(ripple) => (
          <span
            class="ripple"
            style={{
              width: `${ripple.size}px`,
              height: `${ripple.size}px`,
              top: `${ripple.y}px`,
              left: `${ripple.x}px`,
            }}
          />
        )}
      </For>
    </span>
  )
}

type ButtonAttrs = JSX.ButtonHTMLAttributes<HTMLButtonElement>

export const Button = (props: ButtonAttrs) => (
  <ButtonEl {...props}>
    {props.children}
    <Ripples />
  </ButtonEl>
)

export const ButtonPrimary = (props: ButtonAttrs) => (
  <ButtonPrimaryEl {...props}>
    {props.children}
    <Ripples />
  </ButtonPrimaryEl>
)

export const IconButton = (props: ButtonAttrs) => (
  <IconButtonEl {...props}>
    {props.children}
    <Ripples />
  </IconButtonEl>
)
