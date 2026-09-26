import {createMemo, For, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import {useState} from '@/state'
import type {Model} from '@/types'
import {Button} from '../Button'
import {DialogLabel, DialogList, DialogScroll, TooltipButton} from '../dialog/Style'

const Scroll = styled(DialogScroll)`
  max-height: 60vh;
`

const ModelSelectButton = styled(Button)`
  flex-shrink: 0;
  justify-content: flex-start;
  overflow: hidden;
  max-width: 15ch;
  text-overflow: ellipsis;
  white-space: nowrap;
`

interface Props {
  onChange: () => void
}

export const ModelSelect = (props: Props) => {
  const {aiService} = useState()

  const allModels = createMemo(() => {
    const models = aiService.models
    if (!models) return []

    const groups = {} as Record<string, Model[]>

    for (const model of models) {
      groups[model.vendor] ??= []
      groups[model.vendor].push(model)
    }

    // Convert to array for reactive-friendly <For> usage
    return Object.entries(groups).map(([key, models]) => ({key, models}))
  })

  const ModelButton = (props: {model: Model}) => {
    let ref!: HTMLDivElement

    onMount(() => {
      if (aiService.chatModel?.id === props.model.id) {
        ref.scrollIntoView({block: 'center'})
      }
    })

    return (
      <TooltipButton
        ref={ref}
        onClick={() => onSelect(props.model)}
        class={aiService.chatModel?.id === props.model.id ? 'selected' : undefined}
      >
        {props.model.name}
      </TooltipButton>
    )
  }

  const Tooltip = () => (
    <Scroll>
      <DialogList>
        <For each={allModels()}>
          {({key, models}) => (
            <>
              <DialogLabel>{key}</DialogLabel>
              <For each={models}>{(model) => <ModelButton model={model} />}</For>
            </>
          )}
        </For>
      </DialogList>
    </Scroll>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const onSelect = (model: Model) => {
    aiService.setChatModel(model)
    props.onChange()
    closeTooltip()
  }

  const onMenuClick = (e: MouseEvent) => {
    showTooltip({anchor: e.target as HTMLElement})
  }

  return (
    <ModelSelectButton onClick={onMenuClick} data-testid="model_select">
      {aiService.chatModel?.name ?? 'Select model'}
    </ModelSelectButton>
  )
}
