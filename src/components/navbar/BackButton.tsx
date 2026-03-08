import {useNavigate} from '@solidjs/router'
import {Show} from 'solid-js'
import {useState} from '@/state'
import {Button} from '../Button'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {IconArrowBack} from '../icons/Ui'

export const BackButton = () => {
  const {store} = useState()
  const navigate = useNavigate()

  const onBackClick = () => {
    navigate(-1)
  }

  const getBackTitle = () => {
    const prev = store.lastLocation?.pathname
    if (prev?.includes('/editor/')) return 'Back to editor'
    if (prev?.includes('/code/')) return 'Back to code editor'
    if (prev?.includes('/canvas/')) return 'Back to canvas'
    if (prev?.includes('/assistant/')) return 'Back to assistant'
  }

  return (
    <Show when={getBackTitle()}>
      {(backTitle) => (
        <TooltipHelp title={backTitle()}>
          <Button onClick={onBackClick} data-testid="navbar_back">
            <IconArrowBack /> Back
          </Button>
        </TooltipHelp>
      )}
    </Show>
  )
}
