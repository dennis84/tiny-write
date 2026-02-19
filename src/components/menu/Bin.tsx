import {useConfirmDialog} from '@/hooks/use-confirm-dialog'
import {useState} from '@/state'
import {Button, ButtonGroup} from '../Button'
import {DrawerContent} from '../Drawer'
import {IconDelete} from '../Icon'
import {Scroll} from '../Layout'
import {MenuDrawer} from './Menu'
import {MenuNavbar} from './Navbar'
import {Label, Note} from './Style'
import {SubmenuTree} from './SubmenuTree'

export const Bin = () => {
  const {store, deleteService, treeService, locationService} = useState()
  const showConfirmDialog = useConfirmDialog()

  const hasDeletedFiles = () =>
    store.files.some((f) => f.deleted) || store.canvases.some((f) => f.deleted)

  const onEmptyBin = async () => {
    showConfirmDialog({
      title: 'Empty bin',
      content: 'Are you sure you want to permanently delete all items in the bin?',
      onConfirm: async () => {
        const result = await deleteService.emptyBin()
        if (result.navigateTo) locationService.openItem(result.navigateTo)
        treeService.updateAll()
      },
    })
  }

  return (
    <MenuDrawer>
      <MenuNavbar />
      <Scroll>
        <DrawerContent>
          <Label>Bin</Label>
          <Note>💁 Items in bin will be automatically deleted after 14 days.</Note>
          <SubmenuTree showDeleted={true} />
          <ButtonGroup>
            <Button onClick={onEmptyBin} disabled={!hasDeletedFiles()}>
              <IconDelete /> Empty bin
            </Button>
          </ButtonGroup>
        </DrawerContent>
      </Scroll>
    </MenuDrawer>
  )
}
