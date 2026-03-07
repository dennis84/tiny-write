import {Show} from 'solid-js'
import {useState} from '@/state'
import {ButtonGroup, IconButton} from '../Button'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {IconArrowBack, IconSidebar} from '../icons/Ui'
import {FloatingContainer} from './Style'

const MenuButton = () => {
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

export const MenuNavbar = () => {
  const {menuService} = useState()

  return (
    <>
      <FloatingContainer>
        <ButtonGroup background={false}>
          <MenuButton />
        </ButtonGroup>
      </FloatingContainer>
      <FloatingContainer justify="flex-end">
        <ButtonGroup background={false}>
          <Show when={menuService.submenu() !== undefined}>
            <TooltipHelp title="Back to main menu">
              <IconButton
                onClick={() => menuService.setSubmenu(undefined)}
                active={true}
                data-testid="navbar_menu_back"
              >
                <IconArrowBack />
              </IconButton>
            </TooltipHelp>
          </Show>
        </ButtonGroup>
      </FloatingContainer>
    </>
  )
}
