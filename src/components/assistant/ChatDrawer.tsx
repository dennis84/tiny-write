import {useLocation} from '@solidjs/router'
import {onMount} from 'solid-js'
import {type LocationState, useState} from '@/state'
import {Drawer, DrawerContent} from '../Drawer'
import {ChatNavbar} from '../menu/Navbar'
import {Chat} from './Chat'

export const ChatDrawer = () => {
  let scrollContent!: HTMLDivElement
  const {aiService, appService, threadService} = useState()
  const location = useLocation<LocationState>()

  const onDrawerResized = async (width: number) => {
    await aiService.setSidebarWidth(width)
  }

  const onChangeThread = (threadId: string) => {
    appService.setLocation({threadId})
    threadService.open(threadId)
    scrollContent.scrollTo({top: 0, behavior: 'smooth'})
  }

  onMount(() => {
    const threadId = location.state?.threadId
    if (threadId) {
      onChangeThread(threadId)
    } else {
      const thread = threadService.newThread()
      appService.setLocation({threadId: thread.id})
    }
  })

  return (
    <Drawer
      width={aiService.sidebarWidth}
      onResized={onDrawerResized}
      background={10}
      data-tauri-drag-region="true"
      data-drop-target="assistant"
      data-testid="ai_assistant_drawer"
    >
      <ChatNavbar />
      <DrawerContent ref={scrollContent}>
        <Chat scrollContent={() => scrollContent} onChangeThread={onChangeThread} />
      </DrawerContent>
    </Drawer>
  )
}
