import {Show} from 'solid-js'
import {isFile, isLocalFile, useState} from '@/state'
import {IconButton} from '../Button'
import {IconSaveAs} from '../icons/File'

export const CurrentItemSaveButton = () => {
  const {codeService, dialogService, editorService, fileService} = useState()

  const isDirty = () => {
    const currentFile = fileService.currentFile
    if (!currentFile?.lastModified) return false
    return (
      isLocalFile(currentFile) &&
      (!currentFile?.lastSaved || currentFile.lastModified > currentFile.lastSaved)
    )
  }

  const onSave = async () => {
    const currentFile = fileService.currentFile
    if (!isFile(currentFile)) return
    if (currentFile.code) await codeService.writeFile(currentFile)
    else await editorService.writeFile(currentFile)
    dialogService.toast({message: `File saved`, duration: 2000})
  }

  return (
    <Show when={isDirty()}>
      <IconButton primary={true} onClick={onSave} data-testid="current_item_save_button">
        <IconSaveAs />
      </IconButton>
    </Show>
  )
}
