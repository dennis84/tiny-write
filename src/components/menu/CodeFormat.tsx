import {Show} from 'solid-js'
import {File, Mode, PrettierConfig, useState} from '@/state'
import {Button, ButtonGroup, ButtonPrimary} from '@/components/Button'
import {Icon} from '@/components/Icon'
import {Drawer, Label, Link, Sub, Text} from './Style'

interface Props {
  onBack: () => void
}

export const CodeFormat = (props: Props) => {
  const {store, configService, codeService, canvasService, fileService} = useState()

  const updatePrettier = (opt: Partial<PrettierConfig>) =>
    configService.updateConfig({
      prettier: {...store.config.prettier, ...opt},
    })

  const getSelectedFile = (): File | undefined => {
    if (store.mode === Mode.Code) return fileService.currentFile
    if (store.mode === Mode.Canvas) {
      const elementId = canvasService.currentCanvas?.elements.find((el) => el.selected)?.id
      if (!elementId) return
      return fileService.findFileById(elementId)
    }
  }

  const isCodeFile = (): boolean => getSelectedFile()?.code ?? false

  const onPrettify = async () => {
    const file = getSelectedFile()
    if (!file) return
    await codeService.prettify(file)
  }

  return (
    <Drawer data-tauri-drag-region="true">
      <Label>Indentation</Label>
      <Sub data-tauri-drag-region="true">
        <Text>
          Tab Width:
          <input
            type="range"
            min="2"
            max="8"
            step="2"
            value={store.config.prettier.tabWidth}
            onInput={(e: any) => updatePrettier({tabWidth: Number(e.target.value)})}
          />
          {store.config.prettier.tabWidth}
        </Text>
        <Link onClick={() => updatePrettier({useTabs: !store.config.prettier.useTabs})}>
          Use Tabs {store.config.prettier.useTabs && '✅'}
        </Link>
      </Sub>
      <Label>Prettier</Label>
      <Sub data-tauri-drag-region="true">
        <Text>
          Print Width:
          <input
            type="range"
            min="20"
            max="160"
            step="10"
            value={store.config.prettier.printWidth}
            onInput={(e: any) => updatePrettier({printWidth: Number(e.target.value)})}
          />
          {store.config.prettier.printWidth}
        </Text>
        <Link onClick={() => updatePrettier({semi: !store.config.prettier.semi})}>
          Semicolons {store.config.prettier.semi && '✅'}
        </Link>
        <Link onClick={() => updatePrettier({singleQuote: !store.config.prettier.singleQuote})}>
          Single Quote {store.config.prettier.singleQuote && '✅'}
        </Link>
        <Link
          onClick={() => updatePrettier({bracketSpacing: !store.config.prettier.bracketSpacing})}
        >
          Bracket Spacing {store.config.prettier.bracketSpacing && '✅'}
        </Link>
      </Sub>
      <ButtonGroup>
        <Button onClick={props.onBack}>
          <Icon>arrow_back</Icon> Back
        </Button>
        <Show when={isCodeFile()}>
          <ButtonPrimary onClick={onPrettify}>Prettify</ButtonPrimary>
        </Show>
      </ButtonGroup>
    </Drawer>
  )
}
