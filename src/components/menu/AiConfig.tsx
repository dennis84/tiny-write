import {DrawerContent} from '../Drawer'
import {AiSubmenuGithub} from './AiSubmenuGithub'
import {MenuDrawer} from './Menu'
import {MenuNavbar} from './Navbar'

export const AiConfig = () => {
  return (
    <MenuDrawer>
      <MenuNavbar />
      <DrawerContent>
        <AiSubmenuGithub />
      </DrawerContent>
    </MenuDrawer>
  )
}
