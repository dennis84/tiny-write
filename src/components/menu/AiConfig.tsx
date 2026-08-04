import {DrawerContent, DrawerScroll} from '../Drawer'
import {MenuNavbar} from '../navbar/MenuNavbar'
import {AiSubmenuGithub} from './AiSubmenuGithub'
import {AiSubmenuLlamaCpp} from './AiSubmenuLlamaCpp'
import {AiSubmenuOllama} from './AiSubmenuOllama'
import {MenuDrawer} from './Menu'

export const AiConfig = () => {
  return (
    <MenuDrawer>
      <MenuNavbar />
      <DrawerScroll>
        <DrawerContent>
          <AiSubmenuGithub />
          <AiSubmenuOllama />
          <AiSubmenuLlamaCpp />
        </DrawerContent>
      </DrawerScroll>
    </MenuDrawer>
  )
}
