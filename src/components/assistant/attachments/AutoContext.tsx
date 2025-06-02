import {createSignal, Show} from 'solid-js'
import {useState} from '@/state'
import {useCurrentFile} from '@/hooks/current-file'
import {IconToggleOff, IconToggleOn} from '@/components/Icon'
import {TooltipButton} from '@/components/Tooltip'
import {TooltipHelp} from '@/components/TooltipHelp'

export const AutoContextButton = () => {
  const currentFile = useCurrentFile()
  const {store, aiService} = useState()
  const [hover, setHover] = createSignal(false)

  const onClick = async () => {
    await aiService.setAutoContext(!store.ai?.autoContext)
  }

  const onMouseEnter = () => setHover(true)
  const onMouseLeave = () => setHover(false)

  return (
    <Show when={currentFile()?.code}>
      <TooltipHelp title="Adds the current file to context automatically">
        <TooltipButton onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
          <Show when={store.ai?.autoContext}>
            {hover() ? <IconToggleOff /> : <IconToggleOn />}
            Auto context is active. Turn off?
          </Show>
          <Show when={!store.ai?.autoContext}>
            {hover() ? <IconToggleOn /> : <IconToggleOff />}
            Switch auto context on
          </Show>
        </TooltipButton>
      </TooltipHelp>
    </Show>
  )
}
