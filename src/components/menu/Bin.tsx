import {useNavigate} from '@solidjs/router'
import {useState} from '@/state'
import {Button, ButtonGroup} from '../Button'
import {Drawer, Label, Note} from './Style'
import {SubmenuTree} from './SubmenuTree'

interface Props {
  onBack: () => void
}

export const Bin = (props: Props) => {
  const {store, deleteService, treeService} = useState()
  const navigate = useNavigate()

  const onBack = () => {
    props.onBack()
  }

  const hasDeletedFiles = () =>
    store.files.some((f) => f.deleted) || store.canvases.some((f) => f.deleted)

  const onEmptyBin = async () => {
    const result = await deleteService.emptyBin()
    if (result.navigateTo) navigate(result.navigateTo)
    treeService.create()
  }

  return (
    <Drawer data-tauri-drag-region="true">
      <Label>Bin</Label>
      <Note>💁 Items in bin will be automatically deleted after 14 days.</Note>
      <SubmenuTree showDeleted={true} />
      <ButtonGroup>
        <Button onClick={onBack}>↩ Back</Button>
        <Button onClick={onEmptyBin} disabled={!hasDeletedFiles()}>
          ⚠️ Empty bin
        </Button>
      </ButtonGroup>
    </Drawer>
  )
}
