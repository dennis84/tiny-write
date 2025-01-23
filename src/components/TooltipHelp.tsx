import {createSignal, JSX, Show} from 'solid-js'
import {Tooltip} from './Tooltip'

interface Props {
  title: string
  children: JSX.Element
}

export const TooltipHelp = (props: Props) => {
  const [anchor, setAnchor] = createSignal<HTMLElement>()

  const onMouseEnter = (e: MouseEvent) => {
    setAnchor(e.target as HTMLElement)
  }

  const onMouseLeave = () => {
    setAnchor(undefined)
  }

  return (
    <>
      <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        {props.children}
      </span>
      <Show when={anchor() !== undefined}>
        <Tooltip anchor={anchor()!} backdrop={false}>
          {props.title}
        </Tooltip>
      </Show>
    </>
  )
}
