import {useState} from '@/state'
import {Content, Scroll} from '../Layout'
import {Chat} from '../assistant/Chat'
import {FloatingNavbar} from '../menu/Navbar'

export const ChatPage = () => {
  let container!: HTMLDivElement
  const {store} = useState()

  return (
    <Scroll ref={container} data-testid="dir" data-tauri-drag-region="true">
      <Content
        style={{
          'width': '100%',
          'padding-bottom': '0',
          'height': 'auto',
        }}
        config={store.config}
        data-tauri-drag-region="true"
      >
        <FloatingNavbar />
        <Chat scroll={() => container} />
      </Content>
    </Scroll>
  )
}
