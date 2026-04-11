import {Show} from 'solid-js'
import {useState} from '@/state'
import {Page} from '@/types'
import {Button} from '../Button'
import {IconAdd} from '../icons/Ui'

export const AssistantNewButton = () => {
  const {threadService, locationService} = useState()

  const onNewThread = () => {
    if (locationService.page === Page.Assistant) {
      locationService.openPage(Page.Assistant)
    } else {
      const newThread = threadService.newThread()
      locationService.updateState({threadId: newThread.id})
    }
  }

  return (
    <Show when={threadService.currentThread?.messages?.length}>
      <Button onClick={onNewThread}>
        <IconAdd /> New
      </Button>
    </Show>
  )
}
