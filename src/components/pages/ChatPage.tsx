import {onMount, Show} from 'solid-js'
import {RouteSectionProps} from '@solidjs/router'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {useOpen} from '@/hooks/open'
import {Chat} from '../assistant/Chat'
import {Content, Scroll} from '../Layout'

const MaxWidth = styled('div')`
  max-width: 800px;
  margin: 0 auto;
  height: 100%;
`

export const ChatPage = (props: RouteSectionProps) => {
  const {store, threadService} = useState()
  const {openUrl} = useOpen()

  const NewThread = () => {
    onMount(() => {
      const newThread = threadService.newThread()
      openUrl(`/assistant/${newThread.id}`)
    })

    return <></>
  }

  const OpenChat = () => {
    let scrollContent!: HTMLDivElement

    const onChangeThread = (id: string) => {
      openUrl(`/assistant/${id}`)
    }

    onMount(() => {
      if (props.params.id) {
        threadService.open(props.params.id)
      }
    })

    return (
      <Scroll data-testid="dir" data-tauri-drag-region="true">
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
    <Show when={props.params.id} fallback={<NewThread />} keyed>
      <OpenChat />
    </Show>
  )
}
