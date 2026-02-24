import {createResource, onMount, Show, Suspense} from 'solid-js'
import {useState} from '@/state'
import type {Message} from '@/types'
import {Drawer, DrawerScroll} from '../Drawer'
import {Content} from '../Layout'
import {ChatNavbar} from '../menu/Navbar'
import {Chat} from './Chat'
import {ChatInput} from './ChatInput'

export const ChatDrawer = () => {
  let scrollRef!: HTMLDivElement
  const {aiService, configService, threadService, locationService} = useState()

  const onDrawerResized = async (width: number) => {
    await aiService.setSidebarWidth(width)
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

  const onInputMessage = async (message: Message) => {
    await threadService.addMessage(message)
    await threadService.sendMessages()
  }

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
          <DrawerScroll ref={scrollRef} data-testid="chat_scroll">
            <Content style={{'padding-bottom': '0'}}>
              <Chat />
            </Content>
          </DrawerScroll>
          {/* Rerender if code theme has been changed */}
          <Show when={configService.codeTheme} keyed>
            <ChatInput dropArea={() => scrollRef} onMessage={onInputMessage} />
          </Show>
        </Show>
      </Suspense>
    </Drawer>
  )
}
