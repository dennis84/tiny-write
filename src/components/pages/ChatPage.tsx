import type {RouteSectionProps} from '@solidjs/router'
import {createEffect, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useOpen} from '@/hooks/open'
import {Page, useState} from '@/state'
import {Chat} from '../assistant/Chat'
import {Content, Scroll} from '../Layout'

const MaxWidth = styled('div')`
  max-width: 800px;
  margin: 0 auto;
  height: 100%;
`

export const ChatPage = (props: RouteSectionProps) => {
  const {store, appService, threadService, toastService} = useState()
  const {open} = useOpen()

  const OpenChat = () => {
    let scrollContent!: HTMLDivElement

    const onChangeThread = (threadId: string) => {
      open({threadId})
    }

    onMount(async () => {
      try {
        // Create a new thrad on /assistant page and activate in location
        if (!props.params.id) {
          const newThread = threadService.newThread()
          appService.setLocation({threadId: newThread.id})
        }

        threadService.init()
      } catch (_e) {
        await appService.setLocation(undefined)
        toastService.open({message: `Thread not found: ${props.params.id}`, duration: 10_000})
        open({page: Page.Assistant})
      }
    })

    createEffect(() => {
      const currentThread = threadService.currentThread
      // Update URL if thread was persisted
      if (!props.params.id && currentThread?.lastModified) {
        open({threadId: currentThread.id})
      }
    })

    return (
      <Scroll data-testid="assistant" data-tauri-drag-region="true">
        <Content
          ref={scrollContent}
          style={{
            width: '100%',
            'padding-bottom': '0',
            height: 'auto',
          }}
          config={store.config}
          data-tauri-drag-region="true"
        >
          <MaxWidth>
            <Chat scrollContent={() => scrollContent} onChangeThread={onChangeThread} />
          </MaxWidth>
        </Content>
      </Scroll>
    )
  }

  return (
    <>
      {/* Rerender if location changes */}
      {/* eslint-disable-next-line */}
      <Show when={props.params.id} keyed>
        <OpenChat />
      </Show>
    </>
  )
}
