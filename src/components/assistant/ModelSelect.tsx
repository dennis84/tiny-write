import {createSignal, For, onMount, Show} from 'solid-js'
import {useState} from '@/state'
import {Button} from '../Button'
import {IconCheckBox, IconCheckBoxBlank, IconKeyboardArrowDown} from '../Icon'
import {Tooltip, TooltipButton} from '../Tooltip'

interface Props {
  onChange: () => void
}

export const ModelSelect = (props: Props) => {
  const {store, copilotService} = useState()
  const [models, setModels] = createSignal<string[]>()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement>()

  const onSelect = (model: string) => {
    copilotService.setChatModel(model)
    props.onChange()
  }

  const onMenuClick = (e: MouseEvent) => {
    setTooltipAnchor(e.target as HTMLElement)
  }

  const onMenuClose = () => {
    setTooltipAnchor(undefined)
  }

  onMount(async () => {
    setModels(await copilotService.getChatModels())
  })

  return (
    <>
      <Button onClick={onMenuClick}>
        <IconKeyboardArrowDown />
        Select Model
      </Button>
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()!} onClose={onMenuClose}>
          <For each={models()}>
            {(m) => (
              <TooltipButton onClick={() => onSelect(m)}>
                {store.ai?.copilot?.chatModel === m ?
                  <IconCheckBox />
                : <IconCheckBoxBlank />}
                {m}
              </TooltipButton>
            )}
          </For>
        </Tooltip>
      </Show>
    </>
  )
}
