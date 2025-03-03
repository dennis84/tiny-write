import {createSignal, For, Show} from 'solid-js'
import {createAsync} from '@solidjs/router'
import {useState} from '@/state'
import {Model} from '@/services/CopilotService'
import {Button} from '../Button'
import {IconAi} from '../Icon'
import {Tooltip, TooltipButton} from '../Tooltip'

interface Props {
  onChange: () => void
}

export const ModelSelect = (props: Props) => {
  const {copilotService} = useState()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement>()

  const models = createAsync(() => copilotService.getChatModels())

  const onSelect = (model: Model) => {
    copilotService.setChatModel(model)
    props.onChange()
    setTooltipAnchor(undefined)
  }

  const onMenuClick = (e: MouseEvent) => {
    setTooltipAnchor(e.target as HTMLElement)
  }

  const onMenuClose = () => {
    setTooltipAnchor(undefined)
  }

  return (
    <>
      <Button onClick={onMenuClick} data-testid="model_select">
        <IconAi />
        Model
      </Button>
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()!} onClose={onMenuClose}>
          <For each={models()}>
            {(m) => (
              <TooltipButton
                onClick={() => onSelect(m)}
                class={copilotService.chatModel.id === m.id ? 'selected' : undefined}
              >
                {m.name}
              </TooltipButton>
            )}
          </For>
        </Tooltip>
      </Show>
    </>
  )
}
