import {Show} from 'solid-js'
import {isTauri} from '@/env'
import {Drawer} from './Style'
import {AiSubmenuGithub} from './AiSubmenuGithub'

export const AiConfig = () => {
  return (
    <Drawer data-tauri-drag-region="true">
      <Show when={isTauri()}>
        <AiSubmenuGithub />
      </Show>
    </Drawer>
  )
}
