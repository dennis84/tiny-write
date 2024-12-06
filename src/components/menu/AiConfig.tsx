import {Show} from 'solid-js'
import {isTauri} from '@/env'
import {Button, ButtonGroup} from '@/components/Button'
import {Drawer} from './Style'
import {AiSubmenuGithub} from './AiSubmenuGithub'

interface Props {
  onBack: () => void
}

export const AiConfig = (props: Props) => {
  return (
    <Drawer data-tauri-drag-region="true">
      <Show when={isTauri()}>
        <AiSubmenuGithub />
      </Show>
      <ButtonGroup>
        <Button onClick={props.onBack}>↩ Back</Button>
      </ButtonGroup>
    </Drawer>
  )
}
