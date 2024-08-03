import {Drawer, Keys, Label, Sub, Text} from './Menu'
import {Button} from '@/components/Button'

interface Props {
  onBack: () => void;
}

export const Help = (props: Props) => {
  return (
    <Drawer data-tauri-drag-region="true">
      <Label>Markdown shortcuts</Label>
      <Sub data-tauri-drag-region="true">
        <Text>
          (<Keys keys={['␣']} /> =Space)
        </Text>
      </Sub>
      <br/>
      <Label>Heading</Label>
      <Sub data-tauri-drag-region="true">
        <Text><Keys keys={['#', '␣']} /> Heading 1</Text>
        <Text><Keys keys={['##', '␣']} /> Heading 2</Text>
        <Text><Keys keys={['###', '␣']} /> Heading 3</Text>
        <Text>...</Text>
      </Sub>
      <Label>Emphasis</Label>
      <Sub data-tauri-drag-region="true">
        <Text>
          <Keys keys={['**']} />strong
          <Keys keys={['**']} />
        </Text>
        <Text>
          <Keys keys={['__']} />strong
          <Keys keys={['__']} />
        </Text>
        <Text>
          <Keys keys={['*']} />italic
          <Keys keys={['*']} />
        </Text>
        <Text>
          <Keys keys={['~~']} />strikethrough
          <Keys keys={['~~']} />
        </Text>
      </Sub>
      <Label>Horizontal Rules</Label>
      <Sub data-tauri-drag-region="true">
        <Text><Keys keys={['---', '␣']}/>&nbsp;</Text>
        <Text><Keys keys={['___', '␣']}/>&nbsp;</Text>
        <Text><Keys keys={['***', '␣']}/>&nbsp;</Text>
        <Text>
          <small>Tip: Horizontal rules break pages in print layout</small>
        </Text>
      </Sub>
      <Label>Blockquotes</Label>
      <Sub data-tauri-drag-region="true">
        <Text><Keys keys={['>', '␣']}/> Blockquote</Text>
      </Sub>
      <Label>Lists</Label>
      <Sub data-tauri-drag-region="true">
        <Text><Keys keys={['*', '␣']}/> Unordered</Text>
        <Text><Keys keys={['+', '␣']}/> Unordered</Text>
        <Text><Keys keys={['1.', '␣']}/> Ordered</Text>
      </Sub>
      <Label>Code</Label>
      <Sub data-tauri-drag-region="true">
        <Text>
          <Keys keys={['```', '␣']} /> Code block
        </Text>
        <Text>
          <Keys keys={['```', 'lang', '␣']} /> Code block with highlighting
        </Text>
        <Text>
          <Keys keys={['```', 'mermaid', '␣']} /> Create diagrams with mermaid
        </Text>
        <Text>
          Inline <Keys keys={['`']} />code
          <Keys keys={['`']} />
        </Text>
      </Sub>
      <Label>Tables</Label>
      <Sub data-tauri-drag-region="true">
        <Text>
          <Keys keys={['|||', '␣']} /> Table with 2 columns
        </Text>
        <Text>
          <Keys keys={['||||', '␣']} /> Table with 3 columns
        </Text>
        <Text>...</Text>
      </Sub>
      <Label>Links</Label>
      <Sub data-tauri-drag-region="true">
        <Text>
          <Keys keys={['[']} /> Link text
          <Keys keys={['](']} /> URL
          <Keys keys={[')']} />
        </Text>
      </Sub>
      <Label>Images</Label>
      <Sub data-tauri-drag-region="true">
        <Text>
          <Keys keys={['![](']} /> URL or path
          <Keys keys={[')']} />
        </Text>
        <Text>
          <Keys keys={['![']} /> Alt text
          <Keys keys={['](']} /> URL or path
          <Keys keys={[')']} />
        </Text>
      </Sub>
      <Label>Custom Containers</Label>
      <Sub data-tauri-drag-region="true">
        <Text>
          <Keys keys={[':::', '␣']} /> Container of type tip
        </Text>
        <Text>
          <Keys keys={[':::', 'warning', '␣']} /> Container of type warning
        </Text>
        <Text>
          <Keys keys={[':::', 'details', '␣']} /> Container of type details
        </Text>
      </Sub>
      <Button onClick={props.onBack}>↩ Back</Button>
    </Drawer>
  )
}
