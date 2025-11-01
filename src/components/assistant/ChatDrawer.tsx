import {useLocation} from '@solidjs/router'
import {createSignal, onMount, Show} from 'solid-js'
import {type LocationState, useState} from '@/state'
import {Drawer, DrawerContent} from '../Drawer'
import {ChatNavbar} from '../menu/Navbar'
import {Chat} from './Chat'

export const ChatDrawer = () => {
  let scrollContent!: HTMLDivElement
  const {aiService, appService, threadService} = useState()
  const [initialized, setInitialized] = createSignal(false)
  const location = useLocation<LocationState>()

  const onDrawerResized = async (width: number) => {
    await aiService.setSidebarWidth(width)
  }

  const onChangeThread = async (threadId: string) => {
    await appService.setLocation({threadId})
    threadService.init()
    scrollContent.scrollTo({top: 0, behavior: 'smooth'})
    setInitialized(true)
  }

  onMount(async () => {
    const threadId = location.state?.threadId
    // Empty threads are not saved, so we need to create a new one if the thread is not found
    const thread = threadId ? threadService.findThreadById(threadId) : undefined
    if (thread) {
      await onChangeThread(thread.id)
    } else {
      const thread = threadService.newThread()
      await appService.setLocation({threadId: thread.id})
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
        <Show when={initialized()}>
          <Chat scrollContent={() => scrollContent} onChangeThread={onChangeThread} />
        </Show>
      </DrawerContent>
    </Drawer>
  )
}
