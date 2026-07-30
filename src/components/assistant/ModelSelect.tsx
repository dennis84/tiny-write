import {createResource, For, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import type {Model} from '@/services/CopilotService'
import {useState} from '@/state'
import type {AiProvider} from '@/types'
import {Button} from '../Button'
import {DialogLabel, DialogList, DialogScroll, TooltipButton} from '../dialog/Style'

const Scroll = styled(DialogScroll)`
  max-height: 60vh;
`

const ModelSelectButton = styled(Button)`
  white-space: nowrap;
  flex-shrink: 0;
`

interface Props {
  onChange: () => void
}

export const ModelSelect = (props: Props) => {
  const {store, aiService} = useState()

  const [modelsByProvider] = createResource(
    () => ({
      copilot: store.ai?.copilot?.user,
      ollama: store.ai?.ollama?.enabled,
    }),
    async () => {
      const modelsByProvider = await aiService.getChatModels()
      if (!modelsByProvider) return {}

      const groups = {} as Record<AiProvider, Record<string, Model[]>>

      for (const [provider, models] of Object.entries(modelsByProvider) as [
        AiProvider,
        Model[],
      ][]) {
        if (!models) continue
        for (const model of models) {
          groups[provider] ??= {}
          groups[provider][model.vendor] ??= []
          groups[provider][model.vendor].push(model)
        }
      }

      return groups
    },
  )

  const ModelButton = (props: {provider: AiProvider; model: Model}) => {
    let ref!: HTMLDivElement

    onMount(() => {
      if (aiService.chatModel.id === props.model.id) {
        ref.scrollIntoView({block: 'center'})
      }
    })

    return (
      <TooltipButton
        ref={ref}
        onClick={() => onSelect(props.provider, props.model)}
        class={aiService.chatModel.id === props.model.id ? 'selected' : undefined}
      >
        {props.model.name}
      </TooltipButton>
    )
  }

  const Tooltip = () => (
    <Scroll>
      <DialogList>
        <For
          each={Object.entries(modelsByProvider() ?? []) as [AiProvider, Record<string, Model[]>][]}
        >
          {([provider, models]) => (
            <>
              <For each={Object.entries(models ?? [])}>
                {([key, models]) => (
                  <>
                    <DialogLabel>{key}</DialogLabel>
                    <For each={models}>
                      {(model) => <ModelButton provider={provider} model={model} />}
                    </For>
                  </>
                )}
              </For>
            </>
          )}
        </For>
      </DialogList>
    </Scroll>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const onSelect = (provider: AiProvider, model: Model) => {
    aiService.setChatModel(provider, model)
    props.onChange()
    closeTooltip()
  }

  const onMenuClick = (e: MouseEvent) => {
    showTooltip({anchor: e.target as HTMLElement})
  }

  return (
    <ModelSelectButton onClick={onMenuClick} data-testid="model_select">
      {aiService.chatModel.name}
    </ModelSelectButton>
  )
}
