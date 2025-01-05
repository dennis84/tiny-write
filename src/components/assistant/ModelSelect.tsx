import {createSignal, For, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {Common, IconButton} from '../Button'
import {Icon} from '../Icon'

const SelectModel = styled('div')`
  position: relative;
  display: inline-flex;
  select {
    ${Common}
    padding-right: 40px;
    appearance: none;
    background: var(--background-60);
    color: var(--foreground);
    &:hover {
      color: var(--primary-background);
    }
  }
  button {
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 0;
  }
`

export const ModelSelect = () => {
  const {store, copilotService} = useState()
  const [models, setModels] = createSignal<string[]>()

  const onModelChange = (e: Event) => {
    copilotService.setChatModel((e.target as HTMLSelectElement).value)
  }

  onMount(async () => {
    setModels(await copilotService.getChatModels())
  })

  return (
    <SelectModel>
      <select onChange={onModelChange}>
        <For each={models()}>
          {(m) => <option selected={store.ai?.copilot?.chatModel === m}>{m}</option>}
        </For>
      </select>
      <IconButton>
        <Icon>keyboard_arrow_down</Icon>
      </IconButton>
    </SelectModel>
  )
}
