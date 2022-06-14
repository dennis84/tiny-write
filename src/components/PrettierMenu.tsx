import {PrettierConfig, useState} from '../state'
import {Off, Label, Link, Sub, Text} from './Menu'
import {button} from './Button'

interface Props {
  onBack: () => void;
}

export const PrettierMenu = (props: Props) => {
  const [store, ctrl] = useState()

  const updatePrettier = (opt: Partial<PrettierConfig>) => {
    ctrl.updateConfig({
      prettier: {...store.config.prettier, ...opt}
    })
  }

  return (
    <Off
      config={store.config}
      onClick={() => store.editorView.focus()}
      data-tauri-drag-region="true">
      <div>
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
        <button
          class={button(store.config)}
          onClick={props.onBack}>
          ↩ Back
        </button>
      </div>
    </Off>
  )
}
