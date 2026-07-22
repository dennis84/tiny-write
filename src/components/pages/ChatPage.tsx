import {type RouteSectionProps, useLocation} from '@solidjs/router'
import {createEffect, createResource, ErrorBoundary, onMount, Show, Suspense} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {type LocationState, type Message, Page} from '@/types'
import {ChatInput} from '../assistant/ChatInput'
import {Conversation} from '../assistant/Conversation'
import {Content, Scroll} from '../Layout'

export const ChatPage = (props: RouteSectionProps) => {
  let scrollRef!: HTMLDivElement
  const {configService, threadService, dialogService, locationService} = useState()
  const location = useLocation<LocationState>()

  // Create a new thread if not in location state
  createEffect(() => {
    if (props.params.id) return
    if (threadService.resourceState === 'ready') {
      const thread = threadService.newThread()
      setTimeout(() => {
        locationService.updateState({threadId: thread.id})
      }, 0)
    }
  })

  const [initialized] = createResource(
    () => threadService.currentThread?.id,
    async (threadId) => {
      if (!threadId) return
      const shouldSend = await threadService.init(location.state?.newThread)
      if (shouldSend) void threadService.sendMessages()

      return threadId
    },
  )

  createEffect(() => {
    const currentThread = threadService.currentThread
    // Update URL if thread was persisted
    if (!props.params.id && currentThread?.lastModified) {
      locationService.openItem(currentThread)
    }
  })

  const OnError = () => {
    onMount(async () => {
      dialogService.toast({message: `Thread not found: ${props.params.id}`, duration: 10_000})
      locationService.openPage(Page.Assistant)
    })
    return null
  }

  const onInputMessage = async (message: Message) => {
    await threadService.addMessage(message)
    await threadService.sendMessages()
  }

  const ChatContent = styled(Content)`
    max-width: 100%;
    padding-bottom: 0;
    width: var(--content-width);
  `

  return (
    <Suspense>
      <ErrorBoundary fallback={() => <OnError />}>
        <Show when={initialized()} keyed>
          <Scroll ref={scrollRef} data-testid="chat_scroll">
            <ChatContent>
              <Conversation />
            </ChatContent>
          </Scroll>
          {/* Rerender if code theme has been changed */}
          <Show when={configService.codeTheme} keyed>
            <ChatInput dropArea={() => scrollRef} onMessage={onInputMessage} />
          </Show>
        </Show>
      </ErrorBoundary>
    </Suspense>
  )
}
