import {createResource, onMount, Show, Suspense} from 'solid-js'
import {useState} from '@/state'
import {Drawer} from '../Drawer'
import {ChatNavbar} from '../menu/Navbar'
import {Chat} from './Chat'

export const ChatDrawer = () => {
  const {aiService, threadService, locationService} = useState()

  const onDrawerResized = async (width: number) => {
    await aiService.setSidebarWidth(width)
  }

  const onChangeThread = async (threadId: string) => {
    locationService.updateState({threadId})
  }

  // Create a new thread if not in location state
  onMount(() => {
    if (threadService.currentThread) return
    const thread = threadService.newThread()
    locationService.updateState({threadId: thread.id})
  })

  const [initialized] = createResource(
    () => threadService.currentThread?.id,
    (threadId) => {
      if (!threadId) return
      threadService.init()
      return threadId
    },
  )

  return (
    <Drawer
      width={aiService.sidebarWidth}
      onResized={onDrawerResized}
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
