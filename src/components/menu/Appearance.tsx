import {For, Match, Show, Switch} from 'solid-js'
import {
  type CodeThemeName,
  ConfigService,
  type FontName,
  type ThemeName,
} from '@/services/ConfigService'
import {useState} from '@/state'
import {DrawerContent} from '../Drawer'
import {IconCheckBox, IconDarkMode, IconLightMode} from '../Icon'
import {MenuDrawer} from './Menu'
import {MenuNavbar} from './Navbar'
import {Label, Link, Sub, Text} from './Style'

export const Appearance = () => {
  const {store, configService} = useState()

  const onChangeTheme = (main: ThemeName) => () => configService.updateTheme({main})

  const onChangeCodeTheme = (code: CodeThemeName) => () => configService.updateTheme({code})

  const onChangeFont = (font: FontName) => () => configService.updateConfig({font})

  const onChangeFontSize = (e: any) =>
    configService.updateConfig({fontSize: Number(e.target.value)})

  const onChangeContentWidth = (e: any) =>
    configService.updateConfig({contentWidth: Number(e.target.value)})

  return (
    <MenuDrawer>
      <MenuNavbar />
      <DrawerContent>
        <Label>Theme</Label>
        <Sub data-tauri-drag-region="true">
          <For each={Object.entries(ConfigService.themes)}>
            {([key, value]) => (
              <Link onClick={onChangeTheme(key)}>
                <span>{value.label}</span>
                <Switch>
                  <Match when={key === configService.theme.value}>
                    <IconCheckBox />
                  </Match>
                  <Match when={key === store.config.theme.mainDark}>
                    <IconDarkMode />
                  </Match>
                  <Match when={key === store.config.theme.mainLight}>
                    <IconLightMode />
                  </Match>
                </Switch>
              </Link>
            )}
          </For>
        </Sub>
        <Label>Code</Label>
        <Sub data-tauri-drag-region="true">
          <For each={Object.entries(ConfigService.codeThemes)}>
            {([key, value]) => (
              <Link onClick={onChangeCodeTheme(key)}>
                <span>{value.label}</span>
                <Switch>
                  <Match when={key === configService.codeTheme.value}>
                    <IconCheckBox />
                  </Match>
                  <Match when={key === store.config.theme.codeDark}>
                    <IconDarkMode />
                  </Match>
                  <Match when={key === store.config.theme.codeLight}>
                    <IconLightMode />
                  </Match>
                </Switch>
              </Link>
            )}
          </For>
        </Sub>
        <Label>Font</Label>
        <Sub data-tauri-drag-region="true">
          <For each={Object.entries(ConfigService.fonts)}>
            {([key, value]) => (
              <Link onClick={onChangeFont(key)}>
                <span>{value.label}</span>
                <Show when={key === configService.font.value}>
                  <IconCheckBox />
                </Show>
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
              onInput={onChangeFontSize}
            />
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
              onInput={onChangeContentWidth}
            />
            {store.config.contentWidth}
          </Text>
        </Sub>
      </DrawerContent>
    </MenuDrawer>
  )
}
