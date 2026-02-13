import {useLocation, type RouteSectionProps} from '@solidjs/router'
import {createEffect, createResource, ErrorBoundary, onMount, Show, Suspense} from 'solid-js'
import {useOpen} from '@/hooks/use-open'
import {useState} from '@/state'
import {LocationState, Page} from '@/types'
import {Chat} from '../assistant/Chat'

export const ChatPage = (props: RouteSectionProps) => {
  const {appService, threadService, toastService} = useState()
  const {open, updateState} = useOpen()
  const location = useLocation<LocationState>()

  const onChangeThread = (threadId: string) => {
    open({threadId})
  }

  // Create a new thread if not in location state
  onMount(() => {
    if (threadService.currentThread) return
    const thread = threadService.newThread()
    updateState({threadId: thread.id})
  })

  const [initialized] = createResource(
    () => threadService.currentThread?.id, //location.state?.threadId,
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
      open({threadId: currentThread.id})
    }
  })

  const OnError = () => {
    onMount(async () => {
      await appService.setLocation(undefined)
      toastService.open({message: `Thread not found: ${props.params.id}`, duration: 10_000})
      open({page: Page.Assistant})
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
