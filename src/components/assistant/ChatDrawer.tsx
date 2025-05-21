import {useState} from '@/state'
import {Drawer, DrawerContent} from '../Drawer'
import {ChatNavbar} from '../menu/Navbar'
import {Chat} from './Chat'

export const ChatDrawer = () => {
  let scrollContent!: HTMLDivElement
  const {aiService} = useState()

  const onDrawerResized = async (width: number) => {
    await aiService.setSidebarWidth(width)
  }

  return (
    <Drawer
      width={aiService.sidebarWidth}
      onResized={onDrawerResized}
      background={10}
      data-tauri-drag-region="true"
      data-testid="ai_assistant_drawer"
    >
      <ChatNavbar />
      <DrawerContent ref={scrollContent}>
        <Chat scrollContent={() => scrollContent} />
      </DrawerContent>
    </Drawer>
  )
}
