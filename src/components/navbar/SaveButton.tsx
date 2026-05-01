import {Show} from 'solid-js'
import {isDirty, isFile, useState} from '@/state'
import type {File} from '@/types'
import {IconButton} from '../Button'
import {IconSaveAs} from '../icons/File'

export const SaveButton = () => {
  const {codeService, dialogService, editorService, fileService} = useState()

  const onSave = async () => {
    const currentFile = fileService.currentFile
    await saveFile(currentFile)
  }

  const saveFile = async (file?: File) => {
    if (!isFile(file)) return
    if (file.code) await codeService.writeFile(file)
    else await editorService.writeFile(file)
    dialogService.toast({message: `File saved`, duration: 2000})
  }

  return (
    <Show when={isDirty(fileService.currentFile)}>
      <IconButton primary={true} onClick={onSave} data-testid="save_button">
        <IconSaveAs />
      </IconButton>
    </Show>
  )
}
