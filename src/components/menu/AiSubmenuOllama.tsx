import {Show} from 'solid-js'
import {useState} from '@/state'
import {IconToggleOff, IconToggleOn} from '../icons/Ui'
import {Link} from './Link'
import {Label, Sub} from './Style'

export const AiSubmenuOllama = () => {
  const {store, ollamaService} = useState()

  const onDisconnect = async () => {
    await ollamaService.disconnect()
  }

  const onConnect = async () => {
    await ollamaService.connect()
  }

  return (
    <>
      <Label>Ollama</Label>
      <Sub data-tauri-drag-region="true">
        <Show when={!store.ai?.ollama?.enabled}>
          <Link onClick={onConnect} data-testid="ollama_connect">
            <IconToggleOn /> Connect
          </Link>
        </Show>
        <Show when={store.ai?.ollama?.enabled}>
          <Link onClick={onDisconnect} data-testid="ollama_disconnect">
            <IconToggleOff /> Disconnect
          </Link>
        </Show>
      </Sub>
    </>
  )
}
