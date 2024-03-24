import {useState} from '@/state'
import {Button, ButtonGroup} from '../Button'
import {Drawer, Label, Note} from './Menu'
import SubmenuTree from './SubmenuTree'

interface Props {
  onBack: () => void;
}

export const Bin = (props: Props) => {
  const [state, ctrl] = useState()

  const onBack = () => {
    props.onBack()
  }

  const onEmptyBin = async () => {
    for (const it of state.files) {
      if (it.deleted) await ctrl.file.deleteForever(it.id)
    }

    for (const it of state.canvases) {
      if (it.deleted) await ctrl.canvas.deleteForever(it.id)
    }

    ctrl.tree.create()
  }

  return (
    <Drawer data-tauri-drag-region="true">
      <Label>Bin</Label>
      <Note>
        💁 Items in bin will be automatically deleted after 14 days.
      </Note>
      <SubmenuTree showDeleted={true} />
      <ButtonGroup>
        <Button onClick={onBack}>↩ Back</Button>
        <Button onClick={onEmptyBin}>⚠️ Empty bin</Button>
      </ButtonGroup>
    </Drawer>
  )
}
