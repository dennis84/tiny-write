import {For} from 'solid-js'
import {useState} from '@/state'
import {ConfigService} from '@/services/ConfigService'
import {Drawer, Label, Link, Sub, Text} from './Menu'
import {Button} from '@/components/Button'

interface Props {
  onBack: () => void;
}

export const Appearance = (props: Props) => {
  const [store, ctrl] = useState()

  const onChangeTheme = (theme: string) => () =>
    ctrl.config.updateConfig({theme})

  const onChangeCodeTheme = (codeTheme: string) => () =>
    ctrl.config.updateConfig({codeTheme})

  const onChangeFont = (font: string) => () =>
    ctrl.config.updateConfig({font})

  const onChangeFontSize = (e: any) =>
    ctrl.config.updateConfig({fontSize: Number(e.target.value)})

  const onChangeContentWidth = (e: any) =>
    ctrl.config.updateConfig({contentWidth: Number(e.target.value)})

  return (
    <Drawer data-tauri-drag-region="true">
      <Label>Theme</Label>
      <Sub data-tauri-drag-region="true">
        <For each={Object.entries(ConfigService.themes)}>
          {([key, value]) => (
            <Link onClick={onChangeTheme(key)}>
              {value.label}{' '}{key === ctrl.config.theme.value && '✅'}
            </Link>
          )}
        </For>
      </Sub>
      <Label>Code</Label>
      <Sub data-tauri-drag-region="true">
        <For each={Object.entries(ConfigService.codeThemes)}>
          {([key, value]) => (
            <Link onClick={onChangeCodeTheme(key)}>
              {value.label}{' '}{key === ctrl.config.codeTheme.value && '✅'}
            </Link>
          )}
        </For>
      </Sub>
      <Label>Font</Label>
      <Sub data-tauri-drag-region="true">
        <For each={Object.entries(ConfigService.fonts)}>
          {([key, value]) => (
            <Link onClick={onChangeFont(key)}>
              {value.label}{' '}{key === ctrl.config.font.value && '✅'}
            </Link>
          )}
        </For>
      </Sub>
      <Label>Layout</Label>
      <Sub data-tauri-drag-region="true">
        <Text>
          Font size:
          <input
            type="range"
            min="8"
            max="48"
            value={store.config.fontSize}
            onInput={onChangeFontSize} />
          {store.config.fontSize}
        </Text>
        <Text>
          Content width:
          <input
            type="range"
            min="400"
            max="1800"
            step="100"
            value={store.config.contentWidth}
            onInput={onChangeContentWidth} />
          {store.config.contentWidth}
        </Text>
      </Sub>
      <Button data-testid="back" onClick={props.onBack}>↩ Back</Button>
    </Drawer>
  )
}
