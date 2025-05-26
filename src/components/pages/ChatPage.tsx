import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {Chat} from '../assistant/Chat'
import {Content, Scroll} from '../Layout'

const MaxWidth = styled('div')`
  max-width: 800px;
  margin: 0 auto;
  height: 100%;
`

export const ChatPage = () => {
  let scrollContent!: HTMLDivElement
  const {store} = useState()

  return (
    <Scroll data-testid="dir" data-tauri-drag-region="true">
      <Content
        ref={scrollContent}
        style={{
          'width': '100%',
          'padding-bottom': '0',
          'height': 'auto',
        }}
        config={store.config}
        data-tauri-drag-region="true"
      >
        <MaxWidth>
          <Chat scrollContent={() => scrollContent} />
        </MaxWidth>
      </Content>
    </Scroll>
  )
}
