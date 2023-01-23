import {PrettierConfig, useState} from '@/state'
import {Drawer, Label, Link, Sub, Text} from './Menu'
import {Button} from './Button'

interface Props {
  onBack: () => void;
}

export const CodeBlockMenu = (props: Props) => {
  const [store, ctrl] = useState()

  const updatePrettier = (opt: Partial<PrettierConfig>) => {
    ctrl.updateConfig({
      prettier: {...store.config.prettier, ...opt}
    })
  }

  return (
    <Drawer config={store.config}>
      <Label config={store.config}>Indentation</Label>
      <Sub>
        <Text config={store.config}>
          Tab Width:
          <input
            type="range"
            min="2"
            max="8"
            step="2"
            value={store.config.prettier.tabWidth}
            onInput={(e: any) => updatePrettier({tabWidth: Number(e.target.value)})} />
          {store.config.prettier.tabWidth}
        </Text>
        <Link
          config={store.config}
          onClick={() => updatePrettier({useTabs: !store.config.prettier.useTabs})}>
          Use Tabs {store.config.prettier.useTabs && '✅'}
        </Link>
      </Sub>
      <Label config={store.config}>Prettier</Label>
      <Sub>
        <Text config={store.config}>
          Print Width:
          <input
            type="range"
            min="20"
            max="160"
            step="10"
            value={store.config.prettier.printWidth}
            onInput={(e: any) => updatePrettier({printWidth: Number(e.target.value)})} />
          {store.config.prettier.printWidth}
        </Text>
        <Link
          config={store.config}
          onClick={() => updatePrettier({semi: !store.config.prettier.semi})}>
          Semicolons {store.config.prettier.semi && '✅'}
        </Link>
        <Link
          config={store.config}
          onClick={() => updatePrettier({singleQuote: !store.config.prettier.singleQuote})}>
          Single Quote {store.config.prettier.singleQuote && '✅'}
        </Link>
      </Sub>
      <Button onClick={props.onBack}>↩ Back</Button>
    </Drawer>
  )
}
