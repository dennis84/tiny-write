import {Show} from 'solid-js'
import {useState} from '@/state'
import {IconToggleOff} from '../icons/Ui'
import {Link} from './Link'
import {Label, Sub, Text} from './Style'

export const AiSubmenuLlamaCpp = () => {
  const {store, llamaCppService} = useState()

  const onDisconnect = async () => {
    await llamaCppService.disconnect()
  }

  const onConnect = async () => {
    await llamaCppService.connect()
  }

  const onInputHost = async (e: InputEvent) => {
    const value = (e.target as HTMLInputElement).value.trim()
    await llamaCppService.updateHost(value)
  }

  const onBlur = () => {
    llamaCppService.refetchModels()
  }

  return (
    <>
      <Label>LLama.CPP</Label>
      <Sub data-tauri-drag-region="true">
        <Show when={!store.ai?.llamaCpp?.enabled}>
          <Link onClick={onConnect} data-testid="llama_cpp_connect">
            <IconToggleOff /> Connect
          </Link>
        </Show>
        <Show when={store.ai?.llamaCpp?.enabled}>
          <Link onClick={onDisconnect} data-testid="llama_cpp_disconnect">
            <IconToggleOff /> Disconnect
          </Link>
          <Text>
            Host
            <input
              type="text"
              value={store.ai?.llamaCpp?.baseUrl ?? ''}
              placeholder={llamaCppService.baseUrl}
              onInput={onInputHost}
              onBlur={onBlur}
            />
          </Text>
        </Show>
      </Sub>
    </>
  )
}
