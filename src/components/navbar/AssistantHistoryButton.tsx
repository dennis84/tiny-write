import {useState} from '@/state'
import {Page, type Thread} from '@/types'
import {Threads} from '../assistant/Threads'

export const AssistantHistoryButton = () => {
  const {locationService} = useState()

  const onChangeThread = (thread: Thread) => {
    if (locationService.page === Page.Assistant) {
      locationService.openItem(thread)
    } else {
      locationService.updateState({threadId: thread.id})
    }
  }

  return <Threads onChange={onChangeThread} />
}
