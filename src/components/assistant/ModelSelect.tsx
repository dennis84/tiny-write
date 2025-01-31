import {createSignal, For, Show} from 'solid-js'
import {useState} from '@/state'
import {ModelId} from '@/services/CopilotService'
import {Button} from '../Button'
import {IconAi} from '../Icon'
import {Tooltip, TooltipButton} from '../Tooltip'

interface Props {
  onChange: () => void
}

export const ModelSelect = (props: Props) => {
  const {copilotService} = useState()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement>()

  const onSelect = (model: ModelId) => {
    copilotService.setChatModel(model)
    props.onChange()
  }

  const onMenuClick = (e: MouseEvent) => {
    setTooltipAnchor(e.target as HTMLElement)
  }

  const onMenuClose = () => {
    setTooltipAnchor(undefined)
  }

  return (
    <>
      <Button onClick={onMenuClick}>
        <IconAi />
        AI Model
      </Button>
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()!} onClose={onMenuClose}>
          <For each={copilotService.getChatModelIds()}>
            {(m) => (
              <TooltipButton
                onClick={() => onSelect(m)}
                class={copilotService.chatModelId === m ? 'selected' : undefined}
              >
                {m}
              </TooltipButton>
            )}
          </For>
        </Tooltip>
      </Show>
    </>
  )
}
