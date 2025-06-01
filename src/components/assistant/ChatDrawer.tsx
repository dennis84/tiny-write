import {onMount} from 'solid-js'
import {useState} from '@/state'
import {Drawer, DrawerContent} from '../Drawer'
import {ChatNavbar} from '../menu/Navbar'
import {Chat} from './Chat'

export const ChatDrawer = () => {
  let scrollContent!: HTMLDivElement
  const {aiService, appService, threadService} = useState()

  const onDrawerResized = async (width: number) => {
    await aiService.setSidebarWidth(width)
  }

  const onChangeThread = (threadId: string) => {
    appService.setLastLocation({threadId})
    threadService.open(threadId)
    scrollContent.scrollTo({top: 0, behavior: 'smooth'})
  }

  onMount(() => {
    const thread = threadService.newThread()
    appService.setLastLocation({threadId: thread.id})
  })

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
        <Chat scrollContent={() => scrollContent} onChangeThread={onChangeThread} />
      </DrawerContent>
    </Drawer>
  )
}
