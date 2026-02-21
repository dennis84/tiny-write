import {DrawerContent, DrawerScroll} from '../Drawer'
import {AiSubmenuGithub} from './AiSubmenuGithub'
import {MenuDrawer} from './Menu'
import {MenuNavbar} from './Navbar'

export const AiConfig = () => {
  return (
    <MenuDrawer>
      <MenuNavbar />
      <DrawerScroll>
        <DrawerContent>
          <AiSubmenuGithub />
        </DrawerContent>
      </DrawerScroll>
    </MenuDrawer>
  )
}
