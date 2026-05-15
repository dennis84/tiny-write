import {EditorState} from 'prosemirror-state'
import {Show} from 'solid-js'
import {yXmlFragmentToProseMirrorRootNode} from 'y-prosemirror'
import * as Y from 'yjs'
import {TooltipButton} from '@/components/dialog/Style'
import {IconFolderRoot} from '@/components/icons/File'
import {serialize} from '@/prosemirror/markdown-serialize'
import {schema} from '@/prosemirror/schema'
import {FileService} from '@/services/FileService'
import {isFile, isFilename, useState} from '@/state'
import {type Attachment, AttachmentType, type ProjectAttachment} from '@/types'
import {createCodeFence} from '../util'

interface Props {
  onAttachment: (attachment: ProjectAttachment) => void
}

export const AddCurrentProject = (props: Props) => {
  const {projectService, treeService} = useState()

  const onClick = () => {
    const currentProject = projectService.currentProject
    if (!currentProject) return

    const attachments: Attachment[] = []

    treeService.descendants(async (it) => {
      if (isFile(it.value) && it.value.code) {
        const ydoc = new Y.Doc()
        Y.applyUpdate(ydoc, it.value.ydoc)

        const type = ydoc.getText(it.value.id)
        const content = createCodeFence({
          id: it.value.id,
          code: type.toString(),
          lang: it.value.codeLang,
          path: it.value.path,
        })

        attachments.push({
          content,
          type: AttachmentType.File,
          fileId: it.value.id,
          parentId: it.parentId,
          leftId: it.leftId,
        })
      } else if (isFile(it.value)) {
        const ydoc = new Y.Doc()
        Y.applyUpdate(ydoc, it.value.ydoc)
        const type = ydoc.getXmlElement(it.value.id)
        const doc = yXmlFragmentToProseMirrorRootNode(type, schema)
        const state = EditorState.create({doc})
        const content = serialize(state)

        attachments.push({
          content,
          type: AttachmentType.Text,
          fileId: it.value.id,
          parentId: it.parentId,
          leftId: it.leftId,
        })
      } else if (isFilename(it.value)) {
        const text = await FileService.loadTextFile(it.value.path)
        attachments.push({
          content: text.text,
          type: AttachmentType.File,
          fileId: it.value.id,
          parentId: it.parentId,
          leftId: it.leftId,
        })
      }
    }, currentProject.id)

    props.onAttachment({
      type: AttachmentType.Project,
      projectId: currentProject.id,
      projectName: currentProject.name,
      content: attachments,
    })
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
