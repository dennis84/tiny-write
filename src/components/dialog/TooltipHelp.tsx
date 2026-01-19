import {createSignal, type JSX, Show} from 'solid-js'
import {Tooltip} from './Tooltip'

interface Props {
  title: string
  children: JSX.Element
}

export const TooltipHelp = (props: Props) => {
  const [anchor, setAnchor] = createSignal<HTMLElement>()

  const onMouseEnter = (e: MouseEvent) => {
    setAnchor(e.currentTarget as HTMLElement)
  }

  const onMouseLeave = () => {
    setAnchor(undefined)
  }

  return (
    <>
      {/* onClick: close tooltip on touch */}
      <span
        role="none"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onMouseLeave}
      >
        {props.children}
      </span>
      <Show when={anchor()}>
        {(a) => (
          <Tooltip anchor={a()} backdrop={false} delay={300}>
            {props.title}
          </Tooltip>
        )}
      </Show>
    </>
  )
}
