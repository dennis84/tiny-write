import {useConfirmDialog} from '@/hooks/use-confirm-dialog'
import {useState} from '@/state'
import {Button, ButtonGroup} from '../Button'
import {DrawerContent, DrawerScroll} from '../Drawer'
import {IconDelete} from '../icons/Ui'
import {MenuNavbar} from '../navbar/MenuNavbar'
import {MenuDrawer} from './Menu'
import {Label, Note} from './Style'
import {SubmenuTree} from './SubmenuTree'

export const Bin = () => {
  const {fileService, canvasService, deleteService, treeService, locationService} = useState()
  const showConfirmDialog = useConfirmDialog()

  const hasDeletedFiles = () =>
    fileService.files.some((f) => f.deleted) || canvasService.canvases.some((f) => f.deleted)

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
      <DrawerScroll>
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
      </DrawerScroll>
    </MenuDrawer>
  )
}
