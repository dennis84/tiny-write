import {For} from 'solid-js'
import {useState} from '../state'
import {Off, Label, Link, Sub, Text} from './Menu'
import {button} from './Button'
import {codeTheme, codeThemes, fonts, themes, getTheme} from '../config'

interface Props {
  onBack: () => void;
}

export const AppearanceMenu = (props: Props) => {
  const [store, ctrl] = useState()

  const onChangeTheme = (theme: string) => () => {
    ctrl.updateConfig({theme})
  }

  const onChangeCodeTheme = (codeTheme: string) => () => {
    ctrl.updateConfig({codeTheme})
  }

  const onChangeFont = (font: string) => () => {
    ctrl.updateConfig({font})
  }

  const onChangeFontSize = (e: any) => {
    ctrl.updateConfig({fontSize: Number(e.target.value)})
  }

  const onChangeContentWidth = (e: any) => {
    ctrl.updateConfig({contentWidth: Number(e.target.value)})
  }

  return (
    <Off
      config={store.config}
      onClick={() => store.editorView.focus()}
      data-tauri-drag-region="true">
      <div>
        <Label config={store.config}>Theme</Label>
        <Sub>
          <For each={Object.entries(themes)}>
            {([key, value]) => (
              <Link config={store.config} onClick={onChangeTheme(key)}>
                {value.label}{' '}{key === getTheme(store.config).value && '✅'}
              </Link>
            )}
          </For>
        </Sub>
        <Label config={store.config}>Code</Label>
        <Sub>
          <For each={Object.entries(codeThemes)}>
            {([key, value]) => (
              <Link config={store.config} onClick={onChangeCodeTheme(key)}>
                {value.label}{' '}{key === codeTheme(store.config) && '✅'}
              </Link>
            )}
          </For>
        </Sub>
        <Label config={store.config}>Font</Label>
        <Sub>
          <For each={Object.entries(fonts)}>
            {([key, value]) => (
              <Link config={store.config} onClick={onChangeFont(key)}>
                {value.label}{' '}{key === store.config.font && '✅'}
              </Link>
            )}
          </For>
        </Sub>
        <Label config={store.config}>Layout</Label>
        <Sub>
          <Text config={store.config}>
            Font size:
            <input
              type="range"
              min="8"
              max="48"
              value={store.config.fontSize}
              onInput={onChangeFontSize} />
            {store.config.fontSize}
          </Text>
          <Text config={store.config}>
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
        <button
          class={button(store.config)}
          onClick={props.onBack}>
          ↩ Back
        </button>
      </div>
    </Off>
  )
}
