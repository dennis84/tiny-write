import {createResource, For} from 'solid-js'
import {useDialog} from '@/hooks/use-dialog'
import type {Model} from '@/services/CopilotService'
import {useState} from '@/state'
import {Button} from '../Button'
import {DialogLabel, DialogScroll, TooltipButton} from '../dialog/Style'

interface Props {
  onChange: () => void
}

export const ModelSelect = (props: Props) => {
  const {copilotService} = useState()

  const [models] = createResource(async () => {
    const groups: Record<string, Model[]> = {}

    const models = await copilotService.getChatModels()
    if (!models) return groups

    for (const model of models) {
      if (groups[model.vendor] === undefined) {
        groups[model.vendor] = [model]
      } else {
        groups[model.vendor].push(model)
      }
    }

    return groups
  })

  const Tooltip = () => (
    <DialogScroll>
      <For each={Object.entries(models() ?? [])}>
        {([key, models]) => (
          <>
            <DialogLabel>{key}</DialogLabel>
            <For each={models}>
              {(model) => (
                <TooltipButton
                  onClick={() => onSelect(model)}
                  class={copilotService.chatModel.id === model.id ? 'selected' : undefined}
                >
                  {model.name}
                </TooltipButton>
              )}
            </For>
          </>
        )}
      </For>
    </DialogScroll>
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
