import {createSignal, For, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {Button} from '../Button'
import {IconKeyboardArrowDown} from '../Icon'
import {Tooltip, TooltipButton} from '../Tooltip'

const Scroller = styled('div')`
  height: 100%;
  overflow-y: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`

const Content = styled('div')`
  heigth: 100%;
`

interface Props {
  onChange: () => void
}

export const Threads = (props: Props) => {
  const {store, threadService} = useState()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement>()

  const onSelect = (id: string) => {
    setTooltipAnchor(undefined)
    threadService.open(id)
    props.onChange()
  }

  const onMenuClick = (e: MouseEvent) => {
    setTooltipAnchor(e.currentTarget as HTMLElement)
  }

  const onMenuClose = () => {
    setTooltipAnchor(undefined)
  }

  return (
    <>
      <Button onClick={onMenuClick}>
        <IconKeyboardArrowDown />
        Select an old chat
      </Button>
      <Show when={tooltipAnchor()}>
        <Tooltip anchor={tooltipAnchor()!} onClose={onMenuClose}>
          <Scroller>
            <Content>
              <For each={store.threads.filter((t) => !t.active)}>
                {(t) => <TooltipButton onClick={() => onSelect(t.id)}>{t.title}</TooltipButton>}
              </For>
            </Content>
          </Scroller>
        </Tooltip>
      </Show>
    </>
  )
}
