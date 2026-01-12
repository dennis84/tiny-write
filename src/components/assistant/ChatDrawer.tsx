import {createResource, Show, Suspense} from 'solid-js'
import {useState} from '@/state'
import {Drawer, DrawerContent} from '../Drawer'
import {ChatNavbar} from '../menu/Navbar'
import {Chat} from './Chat'

export const ChatDrawer = () => {
  const {aiService, appService, threadService} = useState()

  const onDrawerResized = async (width: number) => {
    await aiService.setSidebarWidth(width)
  }

  const onChangeThread = async (threadId: string) => {
    await appService.setLocation({threadId})
    threadService.init()
    // scrollContent.scrollTo({top: 0, behavior: 'smooth'})
  }

  const [initialized] = createResource(async () => {
    let thread = threadService.currentThread
    // Empty threads are not saved, so we need to create a new one if the thread is not found
    if (!thread) {
      thread = threadService.newThread()
      await appService.setLocation({threadId: thread.id})
    }

    threadService.init()
    return thread.id
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
      <Suspense>
        <Show when={initialized()}>
          <Chat onChangeThread={onChangeThread} />
        </Show>
      </Suspense>
    </Drawer>
  )
}
