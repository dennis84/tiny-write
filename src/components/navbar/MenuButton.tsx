import {useState} from '@/state'
import {IconButton} from '../Button'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {IconSidebar} from '../icons/Ui'

export const MenuButton = () => {
  const {fileService, menuService} = useState()

  const onMenuButtonClick = () => {
    fileService.currentFile?.editorView?.focus()
    menuService.toggleMenu()
    menuService.setSubmenu(undefined)
  }

  return (
    <TooltipHelp title={menuService.menuOpen ? 'Hide sidebar' : 'Show sidebar'}>
      <IconButton onClick={onMenuButtonClick} data-testid="navbar_menu_open">
        <IconSidebar />
      </IconButton>
    </TooltipHelp>
  )
}
