import {createMemo, Show} from 'solid-js'
import {TooltipButton} from '@/components/dialog/Style'
import {IconFileCode} from '@/components/icons/File'
import {isFile, useState} from '@/state'
import type {Attachment, File} from '@/types'

interface Props {
  onAttachment: (attachment: Attachment) => void
}

export const AddParentFile = (props: Props) => {
  const {fileService, threadService, treeService} = useState()

  const parentFile = createMemo<File | undefined>(() => {
    const currentThread = threadService.currentThread
    const parentItem = currentThread?.parentId
      ? treeService.getItem(currentThread.parentId)
      : undefined

    if (isFile(parentItem?.value)) {
      return parentItem.value
    }
  })

  const onClick = () => {
    const parent = parentFile()
    if (!parent) return
    const attachment = fileService.createAttachment(parent)
    props.onAttachment(attachment)
  }

  return (
    <Show when={parentFile()}>
      <TooltipButton onClick={onClick}>
        <IconFileCode />
        Add parent file
      </TooltipButton>
    </Show>
  )
}
