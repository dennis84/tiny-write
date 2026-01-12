import type {RouteSectionProps} from '@solidjs/router'
import {createEffect, createResource, ErrorBoundary, onMount, Show, Suspense} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useOpen} from '@/hooks/use-open'
import {useState} from '@/state'
import {Page} from '@/types'
import {Chat} from '../assistant/Chat'
import {Content, Scroll} from '../Layout'

const MaxWidth = styled('div')`
  max-width: 800px;
  margin: 0 auto;
  height: 100%;
`

export const ChatPage = (props: RouteSectionProps) => {
  let scrollContent!: HTMLDivElement

  const {store, appService, threadService, toastService} = useState()
  const {open} = useOpen()

  const onChangeThread = (threadId: string) => {
    open({threadId})
  }

  const [initialized] = createResource(
    () => ({id: props.params.id}),
    async ({id}) => {
      let currentId = id
      // Create a new thrad on /assistant page and activate in location
      if (!id) {
        const newThread = threadService.newThread()
        await appService.setLocation({threadId: newThread.id})
        currentId = newThread.id
      }

      threadService.init()
      return currentId
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
          {/* <Scroll data-testid="assistant" data-tauri-drag-region="true"> */}
          {/*   <Content */}
          {/*     ref={scrollContent} */}
          {/*     style={{ */}
          {/*       width: '100%', */}
          {/*       'padding-bottom': '0', */}
          {/*       height: 'auto', */}
          {/*     }} */}
          {/*     config={store.config} */}
          {/*     data-tauri-drag-region="true" */}
          {/*   > */}
          {/*     <MaxWidth> */}
          {/*     </MaxWidth> */}
          {/*   </Content> */}
          {/* </Scroll> */}
        </Show>
      </ErrorBoundary>
    </Suspense>
  )
}
