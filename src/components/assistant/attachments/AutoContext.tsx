import {Show} from 'solid-js'
import {useState} from '@/state'
import {IconToggleOff, IconToggleOn} from '@/components/Icon'
import {TooltipButton} from '@/components/Tooltip'
import {useCurrentFile} from '../util'
import {TooltipHelp} from '@/components/TooltipHelp'

export const AutoContextButton = () => {
  const currentFile = useCurrentFile()
  const {store, aiService} = useState()

  const onClick = async () => {
    await aiService.setAutoContext(!store.ai?.autoContext)
  }

  return (
    <Show when={currentFile()?.code}>
      <TooltipHelp title="Adds the current file to context automatically">
        <TooltipButton onClick={onClick}>
          {store.ai?.autoContext ? <IconToggleOff /> : <IconToggleOn />}
          Switch auto context {store.ai?.autoContext ? 'off' : 'on'}
        </TooltipButton>
      </TooltipHelp>
    </Show>
  )
}
