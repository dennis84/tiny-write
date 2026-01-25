import {createResource, For} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import type {Model} from '@/services/CopilotService'
import {useState} from '@/state'
import {Button} from '../Button'
import {TooltipButton} from '../dialog/Style'

const Scroller = styled('div')`
  max-height: 60vh;
  overflow-y: auto;
  position: relative;
  &::-webkit-scrollbar {
    display: none;
  }
`

const Label = styled('div')`
  margin-top: 10px;
  padding: 2px 6px;
  font-size: var(--menu-font-size);
  color: var(--foreground-50);
  font-weight: bold;
`

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
    <Scroller>
      <For each={Object.entries(models() ?? [])}>
        {([key, models]) => (
          <>
            <Label>{key}</Label>
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
    </Scroller>
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
