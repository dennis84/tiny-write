import {useState} from '@/state'
import {Button, ButtonGroup} from '../Button'
import {Drawer, Label, Note} from './Style'
import {SubmenuTree} from './SubmenuTree'

interface Props {
  onBack: () => void
}

export const Bin = (props: Props) => {
  const [state, ctrl] = useState()

  const onBack = () => {
    props.onBack()
  }

  const hasDeletedFiles = () =>
    state.files.some((f) => f.deleted) || state.canvases.some((f) => f.deleted)

  const onEmptyBin = async () => {
    const result = await ctrl.delete.emptyBin()
    ctrl.tree.create()
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
