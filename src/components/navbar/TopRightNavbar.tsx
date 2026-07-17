import {Show} from 'solid-js'
import {useState} from '@/state'
import {ButtonGroup} from '../Button'
import {BackButton} from './BackButton'
import {CollabButton} from './CollabButton'
import {CurrentItemButton} from './CurrentItemButton'
import {DarkModeToggle} from './DarkModeToggle'
import {SaveButton} from './SaveButton'
import {FloatingContainer} from './Style'

export const TopRightNavbar = () => {
  const {canvasService, collabService, fileService} = useState()

  return (
    <FloatingContainer justify="flex-end">
      <ButtonGroup background={true}>
        <BackButton />
        <DarkModeToggle />
        <Show when={fileService.currentFile || canvasService.currentCanvas}>
          <CurrentItemButton />
          <SaveButton />
        </Show>
        <Show when={collabService?.started()}>
          <CollabButton />
        </Show>
      </ButtonGroup>
    </FloatingContainer>
  )
}
