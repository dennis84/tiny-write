import {useState} from '@/state'
import {Content, Scroll} from '../Layout'
import {Chat} from '../assistant/Chat'
import {FloatingNavbar} from '../menu/Navbar'

export const ChatPage = () => {
  let scrollContent!: HTMLDivElement
  const {store} = useState()

  return (
    <Scroll data-testid="dir" data-tauri-drag-region="true">
      <FloatingNavbar />
      <Content
        ref={scrollContent}
        style={{
          'width': '100%',
          'max-width': '800px',
          'padding-bottom': '0',
          'height': 'auto',
        }}
        config={store.config}
        data-tauri-drag-region="true"
      >
        <Chat scrollContent={() => scrollContent} />
      </Content>
    </Scroll>
  )
}
