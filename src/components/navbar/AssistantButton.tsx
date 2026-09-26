import {Show} from 'solid-js'
import {useState} from '@/state'
import {IconButton} from '../Button'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {IconAiAssistant, IconAiAssistantClose} from '../icons/Ai'

export const AssistantButton = () => {
  const {menuService, locationService} = useState()

  const onAssistantClick = async () => {
    const status = menuService.toggleAssistant()
    if (!status) locationService.updateState({threadId: undefined})
  }

  return (
    <>
      <Show when={!menuService.assistant()}>
        <TooltipHelp title="Open Chat">
          <IconButton onClick={onAssistantClick} data-testid="navbar_assistant_open">
            <IconAiAssistant />
          </IconButton>
        </TooltipHelp>
      </Show>
      <Show when={menuService.assistant()}>
        <TooltipHelp title="Close assistant">
          <IconButton active={true} onClick={onAssistantClick} data-testid="navbar_assistant_close">
            <IconAiAssistantClose />
          </IconButton>
        </TooltipHelp>
      </Show>
    </>
  )
}
