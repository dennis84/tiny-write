import {createResource, For} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import type {Model} from '@/services/CopilotService'
import {useState} from '@/state'
import {Button} from '../Button'
import {TooltipButton} from '../dialog/Style'
import {Scroll} from '../Layout'

const DialogScroll = styled(Scroll)`
  &::before {
    height: 60px;
    background-image: linear-gradient(
      to bottom,
      var(--tooltip-background),
      var(--background-0)
    );
  }
  &::after {
    height: 60px;
    background-image: linear-gradient(
      to top,
      var(--tooltip-background),
      var(--background-0)
    );
  }
`

const Scroller = styled('div')``

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
    <DialogScroll>
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
