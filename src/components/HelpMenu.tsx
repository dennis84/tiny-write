import {useState} from '../state'
import {Drawer, Keys, Label, Sub, Text} from './Menu'
import {button} from './Button'

interface Props {
  onBack: () => void;
}

export const HelpMenu = (props: Props) => {
  const [store] = useState()

  return (
    <Drawer
      config={store.config}
      onClick={() => store.editorView.focus()}
      data-tauri-drag-region="true">
      <div>
        <Label config={store.config}>Markdown shortcuts</Label>
        <Sub>
          <Text config={store.config}>
            (<Keys config={store.config} keys={['␣']} /> =Space)
          </Text>
        </Sub>
        <br/>
        <Label config={store.config}>Heading</Label>
        <Sub>
          <Text config={store.config}><Keys config={store.config} keys={['#', '␣']} /> Heading 1</Text>
          <Text config={store.config}><Keys config={store.config} keys={['##', '␣']} /> Heading 2</Text>
          <Text config={store.config}><Keys config={store.config} keys={['###', '␣']} /> Heading 3</Text>
          <Text config={store.config}>...</Text>
        </Sub>
        <Label config={store.config}>Emphasis</Label>
        <Sub>
          <Text config={store.config}>
            <Keys config={store.config} keys={['**']} />strong
            <Keys config={store.config} keys={['**']} />
          </Text>
          <Text config={store.config}>
            <Keys config={store.config} keys={['__']} />strong
            <Keys config={store.config} keys={['__']} />
          </Text>
          <Text config={store.config}>
            <Keys config={store.config} keys={['*']} />italic
            <Keys config={store.config} keys={['*']} />
          </Text>
          <Text config={store.config}>
            <Keys config={store.config} keys={['~~']} />strikethrough
            <Keys config={store.config} keys={['~~']} />
          </Text>
        </Sub>
        <Label config={store.config}>Blockquotes</Label>
        <Sub>
          <Text config={store.config}><Keys config={store.config} keys={['>', '␣']}/> Blockquote</Text>
        </Sub>
        <Label config={store.config}>Lists</Label>
        <Sub>
          <Text config={store.config}><Keys config={store.config} keys={['*', '␣']}/> Unordered</Text>
          <Text config={store.config}><Keys config={store.config} keys={['+', '␣']}/> Unordered</Text>
          <Text config={store.config}><Keys config={store.config} keys={['1.', '␣']}/> Ordered</Text>
        </Sub>
        <Label config={store.config}>Code</Label>
        <Sub>
          <Text config={store.config}>
            <Keys config={store.config} keys={['```', '␣']} /> Code block
          </Text>
          <Text config={store.config}>
            <Keys config={store.config} keys={['```', 'lang', '␣']} /> Code block with highlighting
          </Text>
          <Text config={store.config}>
            Inline <Keys config={store.config} keys={['`']} />code
            <Keys config={store.config} keys={['`']} />
          </Text>
        </Sub>
        <Label config={store.config}>Tables</Label>
        <Sub>
          <Text config={store.config}>
            <Keys config={store.config} keys={['|||', '␣']} /> Table with 2 columns
          </Text>
          <Text config={store.config}>
            <Keys config={store.config} keys={['||||', '␣']} /> Table with 3 columns
          </Text>
          <Text config={store.config}>...</Text>
        </Sub>
        <Label config={store.config}>Links</Label>
        <Sub>
          <Text config={store.config}>
            <Keys config={store.config} keys={['[']} /> Link text
            <Keys config={store.config} keys={['](']} /> URL
            <Keys config={store.config} keys={[')']} />
          </Text>
        </Sub>
        <Label config={store.config}>Images</Label>
        <Sub>
          <Text config={store.config}>
            <Keys config={store.config} keys={['![](']} /> URL or path
            <Keys config={store.config} keys={[')']} />
          </Text>
          <Text config={store.config}>
            <Keys config={store.config} keys={['![']} /> Alt text
            <Keys config={store.config} keys={['](']} /> URL or path
            <Keys config={store.config} keys={[')']} />
          </Text>
        </Sub>
        <Label config={store.config}>Custom Containers</Label>
        <Sub>
          <Text config={store.config}>
            <Keys config={store.config} keys={[':::', '␣']} /> Container of type tip
          </Text>
          <Text config={store.config}>
            <Keys config={store.config} keys={[':::', 'warning', '␣']} /> Container of type warning
          </Text>
          <Text config={store.config}>
            <Keys config={store.config} keys={[':::', 'details', '␣']} /> Container of type details
          </Text>
        </Sub>
        <button
          class={button(store.config)}
          onClick={props.onBack}>
          ↩ Back
        </button>
      </div>
    </Drawer>
  )
}
