import {createSignal, Show} from 'solid-js'
import {TooltipButton} from '@/components/dialog/Tooltip'
import {TooltipHelp} from '@/components/dialog/TooltipHelp'
import {IconToggleOff, IconToggleOn} from '@/components/Icon'
import {useCurrentFile} from '@/hooks/use-current-file'
import {useState} from '@/state'

export const AutoContextToggle = () => {
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
