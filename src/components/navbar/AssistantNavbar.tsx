import {useState} from '@/state'
import {Page} from '@/types'
import {ButtonGroup, IconButton} from '../Button'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {IconFullscreen} from '../icons/Ui'
import {AssistantButton} from './AssistantButton'
import {AssistantNewButton} from './AssistantNewButton'
import {AssistantPrivateButton} from './AssistantPrivateButton'
import {FloatingContainer} from './Style'

export const AssistantNavbar = () => {
  const {menuService, threadService, locationService} = useState()

  const onExpandClick = async () => {
    // Get current thread before resetting in state
    const currentThread = threadService.currentThread
    menuService.toggleAssistant()

    if (currentThread?.lastModified) {
      locationService.openItem(currentThread)
    } else {
      locationService.openPage(Page.Assistant)
    }
  }

  return (
    <>
      <FloatingContainer justify="flex-start">
        <ButtonGroup background={true}>
          <AssistantNewButton />
          <AssistantPrivateButton />
        </ButtonGroup>
      </FloatingContainer>

      <FloatingContainer justify="flex-end">
        <ButtonGroup background={true}>
          <TooltipHelp title="Expand assistant">
            <IconButton onClick={onExpandClick} data-testid="navbar_assistant_expand">
              <IconFullscreen />
            </IconButton>
          </TooltipHelp>
          <AssistantButton />
        </ButtonGroup>
      </FloatingContainer>
    </>
  )
}
