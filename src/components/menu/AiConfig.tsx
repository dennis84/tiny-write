import {DrawerContent} from '../Drawer'
import {Scroll} from '../Layout'
import {AiSubmenuGithub} from './AiSubmenuGithub'
import {MenuDrawer} from './Menu'
import {MenuNavbar} from './Navbar'

export const AiConfig = () => {
  return (
    <MenuDrawer>
      <MenuNavbar />
      <Scroll>
        <DrawerContent>
          <AiSubmenuGithub />
        </DrawerContent>
      </Scroll>
    </MenuDrawer>
  )
}
