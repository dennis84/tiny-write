import {Show} from 'solid-js'
import {useState} from '@/state'
import {Page} from '@/types'
import {ButtonGroup} from '../Button'
import {AssistantButton} from './AssistantButton'
import {BackButton} from './BackButton'
import {CollabButton} from './CollabButton'
import {CurrentFileButton} from './CurrentFileButton'
import {DarkModeToggle} from './DarkModeToggle'
import {FloatingContainer} from './Style'

export const InfoNavbar = () => {
  const {canvasService, collabService, fileService, locationService, menuService} = useState()

  return (
    <FloatingContainer justify="flex-end">
      <ButtonGroup background={true}>
        <BackButton />
        <DarkModeToggle />
        <Show when={fileService.currentFile || canvasService.currentCanvas}>
          <CurrentFileButton />
        </Show>
        <Show when={collabService?.started()}>
          <CollabButton />
        </Show>
        <Show when={!menuService.assistant() && locationService.page !== Page.Assistant}>
          <AssistantButton />
        </Show>
      </ButtonGroup>
    </FloatingContainer>
  )
}
