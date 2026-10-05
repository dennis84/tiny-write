import {createSignal, type JSX, Show} from 'solid-js'
import {IconChevronDown, IconChevronRight} from '@/components/icons/Ui'
import {ToolCallRow, ToolCallTitle} from './Style'

interface Props {
  icon: JSX.Element
  title: JSX.Element
  content?: JSX.Element
  loading?: boolean
}

export const ThinkingRow = (props: Props) => {
  const [show, setShow] = createSignal(false)
  const [hover, setHover] = createSignal(false)

  return (
    <ToolCallRow>
      <ToolCallTitle
        class={props.loading ? 'blink' : undefined}
        onClick={() => setShow(!show())}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <Show when={show() || hover()} fallback={props.icon}>
          <Show when={show()} fallback={<IconChevronRight />}>
            <IconChevronDown />
          </Show>
        </Show>
        {props.title}
      </ToolCallTitle>
      <Show when={show()}>{props.content}</Show>
    </ToolCallRow>
  )
}
