import {Drawer} from './Style'
import {AiSubmenuGithub} from './AiSubmenuGithub'

export const AiConfig = () => {
  return (
    <Drawer data-tauri-drag-region="true">
      <AiSubmenuGithub />
    </Drawer>
  )
}
