import type {RouteSectionProps} from '@solidjs/router'
import {createEffect, createResource, ErrorBoundary, onMount, Show, Suspense} from 'solid-js'
import {useState} from '@/state'
import {Page} from '@/types'
import {Chat} from '../assistant/Chat'

export const ChatPage = (props: RouteSectionProps) => {
  const {threadService, toastService, locationService} = useState()

  const onChangeThread = (threadId: string) => {
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

  createEffect(() => {
    const currentThread = threadService.currentThread
    // Update URL if thread was persisted
    if (!props.params.id && currentThread?.lastModified) {
      locationService.openFile(currentThread)
    }
  })

  const OnError = () => {
    onMount(async () => {
      toastService.open({message: `Thread not found: ${props.params.id}`, duration: 10_000})
      locationService.openPage(Page.Assistant)
    })
    return null
  }

  return (
    <Suspense>
      <ErrorBoundary fallback={() => <OnError />}>
        <Show when={initialized()} keyed>
          <Chat onChangeThread={onChangeThread} />
        </Show>
      </ErrorBoundary>
    </Suspense>
  )
}
