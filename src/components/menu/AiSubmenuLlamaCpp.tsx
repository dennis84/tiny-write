import {Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {IconToggleOff} from '../icons/Ui'
import {Link} from './Link'
import {Label, Sub, Text} from './Style'

const InputText = styled.input`
  margin-left: 10px;
  height: var(--button-height);
  font-size: var(--menu-font-size);
  cursor: var(--cursor-text);
  outline: none;
  text-decoration: none;
  color: var(--foreground);
  font-family: var(--menu-font-family);
  padding: 0 10px;
  background: none;
  border: 1px solid var(--background-50);
  border-radius: var(--border-radius);
`

export const AiSubmenuLlamaCpp = () => {
  const {store, llamaCppService, dialogService} = useState()

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
    dialogService.toast({
      message: 'Refetching LLama.CPP models',
      duration: 3_000,
    })
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
            Base URL:
            <InputText
              type="text"
              id="llama_cpp_base_url"
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
