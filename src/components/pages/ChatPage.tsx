import type {RouteSectionProps} from '@solidjs/router'
import {createEffect, createResource, ErrorBoundary, onMount, Show, Suspense} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {type Message, Page} from '@/types'
import {ChatInput} from '../assistant/ChatInput'
import {Conversation} from '../assistant/Conversation'
import {Content, Scroll} from '../Layout'
import {AssistantNavbar} from '../navbar/AssistantNavbar'

export const ChatPage = (props: RouteSectionProps) => {
  let scrollRef!: HTMLDivElement
  const {configService, threadService, dialogService, locationService} = useState()

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
          <AssistantNavbar />
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
