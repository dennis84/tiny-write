import {Show} from 'solid-js'
import {useState} from '@/state'
import {Page, type Thread} from '@/types'
import {Threads} from '../assistant/Threads'
import {Button, ButtonGroup, IconButton} from '../Button'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {IconAdd, IconFullscreen} from '../icons/Ui'
import {AssistantButton} from './AssistantButton'
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

  const onChangeThread = (thread: Thread) => {
    if (locationService.page === Page.Assistant) {
      locationService.openItem(thread)
    } else {
      locationService.updateState({threadId: thread.id})
    }
  }

  const onNewThread = () => {
    if (locationService.page === Page.Assistant) {
      locationService.openPage(Page.Assistant)
    } else {
      const newThread = threadService.newThread()
      locationService.updateState({threadId: newThread.id})
    }
  }

  return (
    <FloatingContainer justify="flex-start">
      <ButtonGroup justifySelf="flex-start" background={true}>
        <Threads onChange={onChangeThread} />
        <Show when={threadService.currentThread?.messages?.length}>
          <Button onClick={onNewThread}>
            <IconAdd /> New
          </Button>
        </Show>
      </ButtonGroup>
      <Show when={locationService.page !== Page.Assistant}>
        <ButtonGroup background={true}>
          <TooltipHelp title="Expand assistant">
            <IconButton onClick={onExpandClick} data-testid="navbar_assistant_expand">
              <IconFullscreen />
            </IconButton>
          </TooltipHelp>
          <AssistantButton />
        </ButtonGroup>
      </Show>
    </FloatingContainer>
  )
}
