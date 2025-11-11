import {Show} from 'solid-js'
import {ButtonGroup, ButtonPrimary} from '@/components/Button'
import {type File, Page, type PrettierConfig, useState} from '@/state'
import {DrawerContent} from '../Drawer'
import {IconCheckBox} from '../Icon'
import {MenuDrawer} from './Menu'
import {MenuNavbar} from './Navbar'
import {Label, Link, Sub, Text} from './Style'

export const CodeFormat = () => {
  const {store, configService, codeService, canvasService, fileService} = useState()

  const updatePrettier = (opt: Partial<PrettierConfig>) =>
    configService.updateConfig({
      prettier: {...store.config.prettier, ...opt},
    })

  const getSelectedFile = (): File | undefined => {
    if (store.location?.page === Page.Code) return fileService.currentFile
    if (store.location?.page === Page.Canvas) {
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
    <MenuDrawer>
      <MenuNavbar />
      <DrawerContent>
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
            <span>Use Tabs</span>
            <Show when={store.config.prettier.useTabs}>
              <IconCheckBox />
            </Show>
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
            <span>Semicolons</span>
            <Show when={store.config.prettier.semi}>
              <IconCheckBox />
            </Show>
          </Link>
          <Link onClick={() => updatePrettier({singleQuote: !store.config.prettier.singleQuote})}>
            <span>Single Quote</span>
            <Show when={store.config.prettier.singleQuote}>
              <IconCheckBox />
            </Show>
          </Link>
          <Link
            onClick={() => updatePrettier({bracketSpacing: !store.config.prettier.bracketSpacing})}
          >
            <span>Bracket Spacing</span>
            <Show when={store.config.prettier.bracketSpacing}>
              <IconCheckBox />
            </Show>
          </Link>
        </Sub>
        <ButtonGroup>
          <Show when={isCodeFile()}>
            <ButtonPrimary onClick={onPrettify}>Prettify</ButtonPrimary>
          </Show>
        </ButtonGroup>
      </DrawerContent>
    </MenuDrawer>
  )
}
