import {createSignal, For, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'

const SelectModel = styled('select')`
  margin-top: 20px;
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
    <SelectModel onChange={onModelChange}>
      <For each={models()}>
        {(m) => <option selected={store.ai?.copilot?.chatModel === m}>{m}</option>}
      </For>
    </SelectModel>
  )
}
