import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {Config, isEditorElement, Mode, State} from '@/state'
import * as remote from '@/remote'
import {DB} from '@/db'
import {isDark} from '@/env'
import {Ctrl} from '.'
import {debounce} from 'ts-debounce'

export interface Font {
  label: string;
  value: string;
  regular?: string;
  bold?: string;
  italic?: string;
  monospace?: boolean;
}

interface Theme {
  value: string;
  label: string;
  background: string;
  foreground: string;
  primaryForeground: string;
  primaryBackground: string;
  tooltipBackground: string;
  selection: string;
  border: string;
  dark: boolean;
}

interface CodeTheme {
  label: string;
  value: string;
  dark: boolean;
}

export class ConfigService {

  readonly themes: Record<string, Theme> = {
    'light': {
      value: 'light',
      label: 'Light',
      background: '#ffffff',
      foreground: '#666666',
      primaryBackground: '#0000EE',
      primaryForeground: '#ffffff',
      selection: '#80CBC440',
      tooltipBackground: '#eeeeee',
      border: '#cccccc',
      dark: false,
    },
    'dark': {
      value: 'dark',
      label: 'Dark',
      background: '#16161a',
      foreground: '#dadfe5',
      primaryBackground: '#68ffb8',
      primaryForeground: '#32825B',
      selection: '#3d375e7f',
      tooltipBackground: '#2d2d31',
      border: '#687b93',
      dark: true,
    },
    'gruvbox-dark': {
      value: 'gruvbox-dark',
      label: 'Gruvbox Dark',
      background: '#282828',
      foreground: '#ebdbb2',
      primaryBackground: '#d65d0e',
      primaryForeground: '#ffffff',
      selection: '#dfbf8e22',
      tooltipBackground: '#474544',
      border: '#756D59',
      dark: true,
    },
    'solarized-light': {
      value: 'solarized-light',
      label: 'Solarized Light',
      background: '#fdf6e3',
      foreground: '#657b83',
      primaryBackground: '#2aa198',
      primaryForeground: '#fff',
      selection: '#657b8322',
      tooltipBackground: '#e4ddcc',
      border: '#B1AC9E',
      dark: false,
    },
    'solarized-dark': {
      value: 'solarized-dark',
      label: 'Solarized Dark',
      background: '#002b36',
      foreground: '#839496',
      primaryBackground: '#268bd2',
      primaryForeground: '#fff',
      selection: '#ffffff11',
      tooltipBackground: '#1a404a',
      border: '#4C6A72',
      dark: true,
    },
    'material': {
      value: 'material',
      label: 'Material',
      background: '#263238',
      foreground: '#92989b',
      primaryBackground: '#009688',
      primaryForeground: '#ffffff',
      selection: '#80CBC420',
      tooltipBackground: '#3c474c',
      border: '#676F73',
      dark: true,
    },
    'dracula': {
      value: 'dracula',
      label: 'Dracula',
      background: '#282a36',
      foreground: '#f2f8f8',
      primaryBackground: '#bd93f9',
      primaryForeground: '#ffffff',
      selection: '#bd93f922',
      tooltipBackground: '#3e3f4a',
      border: '#7E7F86',
      dark: true,
    },
    'tokyo-night': {
      value: 'tokyo-night',
      label: 'Tokyo Night',
      background: '#1a1b26',
      foreground: '#c0caf5',
      primaryBackground: '#7AA2F7',
      primaryForeground: '#fff',
      selection: '#c0caf522',
      tooltipBackground: '#31323c',
      border: '#75767C',
      dark: true,
    },
    'tokyo-night-day': {
      value: 'tokyo-night-day',
      label: 'Tokyo Night Day',
      background: '#e1e2e7',
      foreground: '#3760bf',
      primaryBackground: '#9854f1',
      primaryForeground: '#fff',
      selection: '#3760bf22',
      tooltipBackground: '#dfdfe2',
      border: '#9eacce',
      dark: false,
    },
    'soft-era': {
      value: 'soft-era',
      label: 'Soft Era',
      background: '#f9f5f5',
      foreground: '#ba989c',
      primaryBackground: '#b8bde8',
      primaryForeground: '#585a6d',
      selection: '#ba989c22',
      tooltipBackground: '#e0dddd',
      border: '#AEABAB',
      dark: false,
    },
  }

  readonly DEFAULT_FONT = 'ia-writer-mono'

  readonly fonts: Record<string, Font> = {
    'system-ui': {
      label: 'System UI',
      value: 'system-ui',
    },
    'merriweather': {
      label: 'Merriweather',
      value: 'merriweather',
      regular: '/Merriweather-Regular.ttf',
      bold: '/Merriweather-Black.ttf',
      italic: '/Merriweather-Italic.ttf',
    },
    'ibm-plex-sans': {
      label: 'IBM Plex Sans',
      value: 'ibm-plex-sans',
      regular: '/IBMPlexSans-Regular.woff2',
      bold: '/IBMPlexSans-Bold.woff2',
      italic: '/IBMPlexSans-Italic.woff2',
    },
    'ibm-plex-serif': {
      label: 'IBM Plex Serif',
      value: 'ibm-plex-serif',
      regular: '/IBMPlexSerif-Regular.woff2',
      bold: '/IBMPlexSerif-Bold.woff2',
      italic: '/IBMPlexSerif-Italic.woff2',
    },
    'jetbrains-mono': {
      label: 'JetBrains Mono',
      value: 'jetbrains-mono',
      regular: '/JetBrainsMono-ExtraLight.woff2',
      bold: '/JetBrainsMono-Bold.woff2',
      italic: '/JetBrainsMono-Italic.woff2',
      monospace: true,
    },
    'ia-writer-mono': {
      label: 'iA Writer Mono',
      value: 'ia-writer-mono',
      regular: '/iAWriterMonoS-Regular.woff2',
      bold: '/iAWriterMonoS-Bold.woff2',
      italic: '/iAWriterMonoS-Italic.ttf',
      monospace: true,
    },
    'scientifica': {
      label: 'Scientifica',
      value: 'scientifica',
      regular: '/scientifica.ttf',
      bold: '/scientificaBold.ttf',
      italic: '/scientificaItalic.ttf',
      monospace: true,
    },
  }

  readonly codeThemes: Record<string, CodeTheme> = {
    'dracula': {
      label: 'Dracula',
      value: 'dracula',
      dark: true,
    },
    'material-dark': {
      label: 'Material Dark',
      value: 'material-dark',
      dark: true,
    },
    'material-light': {
      label: 'Material Light',
      value: 'material-light',
      dark: false,
    },
    'solarized-dark': {
      label: 'Solarized Dark',
      value: 'solarized-dark',
      dark: true,
    },
    'solarized-light': {
      label: 'Solarized Light',
      value: 'solarized-light',
      dark: false,
    },
    'github-light': {
      label: 'Github Light',
      value: 'github-light',
      dark: false,
    },
    'github-dark': {
      label: 'Github Dark',
      value: 'github-dark',
      dark: true,
    },
    'aura': {
      label: 'Aura Dark',
      value: 'aura',
      dark: true,
    },
    'tokyo-night': {
      label: 'Tokyo Night',
      value: 'tokyo-night',
      dark: true,
    },
    'tokyo-night-day': {
      label: 'Tokyo Night Day',
      value: 'tokyo-night-day',
      dark: false,
    },
  }

  readonly borderRadius = '5px';

  private saveConfigDebounced = debounce((state) => this.saveConfig(state), 100)

  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get fontSize() {
    return this.store.config.fontSize
  }

  get typewriterMode() {
    return this.store.mode === Mode.Editor && this.store.config.typewriterMode
  }

  get prettier() {
    return this.store.config.prettier
  }

  get codeTheme() {
    const getDefaltCodeTheme = () => isDark()
      ? this.codeThemes.dracula
      : this.codeThemes['material-light']
    const currentCodeTheme = this.store.config.codeTheme
    return !currentCodeTheme
      ? getDefaltCodeTheme()
      : this.codeThemes[currentCodeTheme]
        ? this.codeThemes[currentCodeTheme]
        : getDefaltCodeTheme()
  }

  get font() {
    return (
      this.store.config?.font
        ? this.fonts[this.store.config.font]
        : undefined
    ) ?? this.fonts[this.DEFAULT_FONT]
  }

  get fontFamily() {
    return this.getFontFamily()
  }

  get theme() {
    return !this.store.config?.theme
      ? this.getDefaltTheme()
      : this.themes[this.store.config.theme] ?? this.getDefaltTheme()
  }

  getFontFamily = (
    options: {monospace?: boolean; bold?: boolean; italic?: boolean} = {}
  ): string => {
    const font = this.font
    if (options.monospace && !font?.monospace) {
      return this.fonts[this.DEFAULT_FONT].value
    } else if (options.bold && font?.bold) {
      return font.value + ' bold'
    } else if (options.italic && font?.italic) {
      return font.value + ' italic'
    }

    return font.value
  }

  getTheme(state: State, force = false) {
    const matchDark = window.matchMedia('(prefers-color-scheme: dark)')
    const isDark = matchDark.matches
    const update = force || !state.config.theme
    if (update && isDark && !this.theme.dark) {
      return {theme: 'dark', codeTheme: 'material-dark'}
    } else if (update && !isDark && this.theme.dark) {
      return {theme: 'light', codeTheme: 'material-light'}
    }

    return {}
  }

  async setAlwaysOnTop(alwaysOnTop: boolean) {
    await remote.setAlwaysOnTop(alwaysOnTop)
    this.setState('config', {alwaysOnTop})
  }

  async updateConfig(conf: Partial<Config>) {
    const state: State = unwrap(this.store)
    if (conf.font) state.collab?.ydoc?.getMap('config').set('font', conf.font)
    if (conf.fontSize) state.collab?.ydoc?.getMap('config').set('fontSize', conf.fontSize)
    if (conf.contentWidth) state.collab?.ydoc?.getMap('config').set('contentWidth', conf.contentWidth)
    const config = {...state.config, ...conf}
    this.setState('config', config)
    if (state.mode === Mode.Editor) {
      this.ctrl.editor.updateEditorState()
    } else if (state.mode == Mode.Canvas) {
      this.ctrl.canvas.currentCanvas?.elements.forEach((el) => {
        if (isEditorElement(el)) {
          this.ctrl.canvas.updateEditorState(el.id)
        }
      })
    }

    await this.saveConfig(unwrap(this.store))
  }

  updateContentWidth(contentWidth: number) {
    this.store.collab?.ydoc?.getMap('config').set('contentWidth', contentWidth)
    this.setState('config', 'contentWidth', contentWidth)
    void this.saveConfigDebounced(unwrap(this.store))
  }

  async updateTheme() {
    this.setState('config', this.getTheme(unwrap(this.store), true))
    await this.saveConfig(unwrap(this.store))
  }

  private async saveConfig(state: State) {
    await DB.setConfig(state.config)
    remote.info('Config saved')
  }

  private getDefaltTheme() {
    return isDark() ? this.themes.dark : this.themes.light
  }
}
