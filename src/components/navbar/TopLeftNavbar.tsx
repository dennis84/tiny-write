import {Show} from 'solid-js'
import {useState} from '@/state'
import {Page} from '@/types'
import {ButtonGroup} from '../Button'
import {AssistantHistoryButton} from './AssistantHistoryButton'
import {AssistantNewButton} from './AssistantNewButton'
import {AssistantPrivateButton} from './AssistantPrivateButton'
import {MenuButton} from './MenuButton'
import {FloatingContainer} from './Style'

export const TopLeftNavbar = () => {
  const {menuService, locationService} = useState()

  return (
    <FloatingContainer justify="flex-start">
      <Show when={!menuService.menuOpen}>
        <ButtonGroup background={false}>
          <MenuButton />
        </ButtonGroup>
      </Show>

      <Show when={locationService.page === Page.Assistant}>
        <ButtonGroup justifySelf="flex-start" background={true}>
          <AssistantHistoryButton />
          <AssistantNewButton />
          <AssistantPrivateButton />
        </ButtonGroup>
      </Show>
    </FloatingContainer>
  )
}
