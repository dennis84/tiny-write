import {useCollabCount} from '@/hooks/use-collab-count'
import {useDialog} from '@/hooks/use-dialog'
import {copy} from '@/remote/clipboard'
import {useState} from '@/state'
import {Button} from '../Button'
import {DialogList, TooltipButton} from '../dialog/Style'
import {IconCloud, IconCloudOff, IconCopy} from '../icons/Ui'

export const CollabButton = () => {
  const {collabService, dialogService} = useState()
  const collabCount = useCollabCount()

  const Tooltip = () => (
    <DialogList>
      <TooltipButton onClick={onStop}>
        <IconCloudOff />
        Disconnect
      </TooltipButton>
      <TooltipButton onClick={onCopyCollabLink}>
        <IconCopy /> Copy Link
      </TooltipButton>
    </DialogList>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const onOpen = (e: MouseEvent) => {
    showTooltip({anchor: e.currentTarget as HTMLElement})
  }

  const onStop = () => {
    collabService.disconnect()
    closeTooltip()
  }

  const onCopyCollabLink = async () => {
    const joinUrl = collabService.getJoinUrl()
    if (joinUrl) {
      await copy(joinUrl)
      dialogService.toast({message: 'Collab link copied to clipboard', duration: 2000})
    }
    closeTooltip()
  }

  return (
    <Button onClick={onOpen} data-testid="navbar_collab">
      <IconCloud /> {collabCount()}
    </Button>
  )
}
