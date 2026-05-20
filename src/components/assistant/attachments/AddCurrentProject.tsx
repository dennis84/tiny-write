import {Show} from 'solid-js'
import {TooltipButton} from '@/components/dialog/Style'
import {IconFolderRoot} from '@/components/icons/File'
import {useState} from '@/state'
import type {ProjectAttachment} from '@/types'

interface Props {
  onAttachment: (attachment: ProjectAttachment) => void
}

export const AddCurrentProject = (props: Props) => {
  const {projectService} = useState()

  const onClick = async () => {
    const currentProject = projectService.currentProject
    if (!currentProject) return

    props.onAttachment(await projectService.createAttachment(currentProject))
  }

  return (
    <Show when={projectService.currentProject}>
      <TooltipButton onClick={onClick}>
        <IconFolderRoot />
        Add current project
      </TooltipButton>
    </Show>
  )
}
