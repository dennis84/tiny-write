import {IconImage} from '@/components/Icon'
import {TooltipButton} from '@/components/Tooltip'
import {DropTarget} from '@/services/MediaService'
import {useState} from '@/state'

interface Props {
  onAttachment: () => void
}

export const ImageButton = (props: Props) => {
  const {mediaService} = useState()

  const onClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*' // Restrict to images
    input.multiple = true

    // Handle file selection
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement
      const files = target.files
      if (files) {
        await mediaService.dropFiles(files, [0, 0], DropTarget.Assistant)
        props.onAttachment()
      }
    }

    // Trigger the file input click
    input.click()
  }

  return (
    <TooltipButton onClick={onClick}>
      <IconImage />
      Add image
    </TooltipButton>
  )
}
