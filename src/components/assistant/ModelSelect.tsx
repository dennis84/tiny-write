import {createAsync} from '@solidjs/router'
import {For} from 'solid-js'
import {useDialog} from '@/hooks/use-dialog'
import type {Model} from '@/services/CopilotService'
import {useState} from '@/state'
import {Button} from '../Button'
import {TooltipButton} from '../dialog/Style'

interface Props {
  onChange: () => void
}

export const ModelSelect = (props: Props) => {
  const {copilotService} = useState()

  const models = createAsync(() => copilotService.getChatModels())

  const Tooltip = () => (
    <>
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
    </>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const onSelect = (model: Model) => {
    copilotService.setChatModel(model)
    props.onChange()
    closeTooltip()
  }

  const onMenuClick = (e: MouseEvent) => {
    showTooltip({anchor: e.target as HTMLElement})
  }

  return (
    <Button onClick={onMenuClick} data-testid="model_select">
      {copilotService.chatModel.name}
    </Button>
  )
}
