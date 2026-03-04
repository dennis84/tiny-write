import {createEffect, Show, untrack} from 'solid-js'
import {useState} from '@/state'
import {Page} from '@/types'
import {ChatDrawer} from './ChatDrawer'

export const ChatSidebar = () => {
  const {menuService, locationService} = useState()
  createEffect(() => {
    const isMenuOpen = untrack(() => menuService.assistant())
    // Open assistant menu if merge was applied in assistant mode
    if (locationService.page !== Page.Assistant && locationService.state?.threadId && !isMenuOpen) {
      menuService.showAssistant()
    }
  })

  return (
    <Show when={menuService.assistant()}>
      <ChatDrawer />
    </Show>
  )
}
