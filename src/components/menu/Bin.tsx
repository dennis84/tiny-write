import {Button, ButtonGroup} from '../Button'
import {Drawer, Label, Note} from './Menu'
import SubmenuTree from './SubmenuTree'

interface Props {
  onBack: () => void;
}

export const Bin = (props: Props) => {
  const onBack = () => {
    props.onBack()
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
      </ButtonGroup>
    </Drawer>
  )
}
