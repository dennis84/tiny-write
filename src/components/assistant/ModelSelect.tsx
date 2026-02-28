import {createResource, For, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import type {Model} from '@/services/CopilotService'
import {useState} from '@/state'
import {Button} from '../Button'
import {DialogLabel, DialogList, DialogScroll, TooltipButton} from '../dialog/Style'

const Scroll = styled(DialogScroll)`
  max-height: 60vh;
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

  const ModelButton = (props: {model: Model}) => {
    let ref!: HTMLDivElement

    onMount(() => {
      if (copilotService.chatModel.id === props.model.id) {
        ref.scrollIntoView({block: 'center'})
      }
    })

    return (
      <TooltipButton
        ref={ref}
        onClick={() => onSelect(props.model)}
        class={copilotService.chatModel.id === props.model.id ? 'selected' : undefined}
      >
        {props.model.name}
      </TooltipButton>
    )
  }

  const Tooltip = () => (
    <Scroll>
      <For each={Object.entries(models() ?? [])}>
        {([key, models]) => (
          <DialogList>
            <DialogLabel>{key}</DialogLabel>
            <For each={models}>{(model) => <ModelButton model={model} />}</For>
          </DialogList>
        )}
      </For>
    </Scroll>
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
