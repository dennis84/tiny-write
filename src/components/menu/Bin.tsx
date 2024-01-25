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

  const onEmptyBin = () => {
    state.files.forEach((it) => {
      if (it.deleted) ctrl.file.deleteForever(it.id)
    })

    state.canvases.forEach((it) => {
      if (it.deleted) ctrl.canvas.deleteForever(it.id)
    })

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
