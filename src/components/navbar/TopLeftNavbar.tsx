import {Show} from 'solid-js'
import {useState} from '@/state'
import {ButtonGroup} from '../Button'
import {MenuButton} from './MenuButton'
import {FloatingContainer} from './Style'

export const TopLeftNavbar = () => {
  const {menuService} = useState()

  return (
    <FloatingContainer justify="flex-start">
      <Show when={!menuService.menuOpen}>
        <ButtonGroup background={false}>
          <MenuButton />
        </ButtonGroup>
      </Show>
    </FloatingContainer>
  )
}
