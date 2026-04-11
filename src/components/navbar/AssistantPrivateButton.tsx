import {Show} from 'solid-js'
import {useState} from '@/state'
import {Button} from '../Button'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {IconPrivate} from '../icons/Ai'

export const AssistantPrivateButton = () => {
  const {threadService} = useState()

  const onPrivate = async () => {
    await threadService.togglePrivate()
  }

  return (
    <Show when={!threadService.currentThread?.lastModified}>
      <TooltipHelp
        title={
          threadService.currentThread?.private ? 'Switch to default chat' : 'Switch to private chat'
        }
      >
        <Button active={threadService.currentThread?.private} onClick={onPrivate}>
          <IconPrivate /> Private
        </Button>
      </TooltipHelp>
    </Show>
  )
}
