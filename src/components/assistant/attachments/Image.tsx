import type {Attachment} from '@/state'
import {IconImage} from '@/components/Icon'
import {TooltipButton} from '@/components/Tooltip'

interface Props {
  onAttachment: (images: Attachment[]) => void
}

export const ImageButton = (props: Props) => {
  const onClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*' // Restrict to images
    input.multiple = true

    // Handle file selection
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement
      const files = target.files
      if (files) {
        const newFilesData: Attachment[] = []
        Array.from(files).forEach((file) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const base64String = e.target?.result as string
            newFilesData.push({type: 'image', name: file.name, data: base64String})

            // Update state when all files are processed
            if (newFilesData.length === files.length) {
              props.onAttachment(newFilesData)
            }
          }
          reader.readAsDataURL(file)
        })
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
