import type {SetStoreFunction, Store} from 'solid-js/store'
import {debounce} from 'throttle-debounce'
import {DB} from '@/db'
import {isDark} from '@/env'
import {setAlwaysOnTop} from '@/remote/app'
import {info} from '@/remote/log'
import type {Config, State} from '@/state'
import type {CollabService} from './CollabService'

export interface Font {
  label: string
  value: string
  regular?: string
  bold?: string
  italic?: string
  monospace?: boolean
}

interface Theme {
  value: string
  label: string
  background: string
  foreground: string
  primaryForeground: string
  primaryBackground: string
  tooltipBackground: string
  selection: string
  border: string
  dark: boolean
}

interface CodeTheme {
  label: string
  value: string
  dark: boolean
}

export type ThemeName = keyof typeof ConfigService.themes
export type CodeThemeName = keyof typeof ConfigService.codeThemes
export type FontName = keyof typeof ConfigService.fonts

export class ConfigService {
  static readonly themes: Record<string, Theme> = {
    light: {
      value: 'light',
      label: 'Light',
      background: '#ffffff',
      foreground: '#666666',
      primaryBackground: '#0000EE',
      primaryForeground: '#ffffff',
      selection: '#80CBC440',
      tooltipBackground: '#ffffff',
      border: '#cccccc',
      dark: false,
    },
    dark: {
      value: 'dark',
      label: 'Dark',
      background: '#16161a',
      foreground: '#dadfe5',
      primaryBackground: '#838eff',
      primaryForeground: '#ffffff',
      selection: '#3d375e7f',
      tooltipBackground: '#32323b',
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
      selection: '#689d6a80',
      tooltipBackground: '#181818',
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
      tooltipBackground: '#ffffff',
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
      tooltipBackground: '#001920',
      border: '#4C6A72',
      dark: true,
    },
    material: {
      value: 'material',
      label: 'Material',
      background: '#263238',
      foreground: '#92989b',
      primaryBackground: '#009688',
      primaryForeground: '#ffffff',
      selection: '#80CBC420',
      tooltipBackground: '#161e21',
      border: '#676F73',
      dark: true,
    },
    dracula: {
      value: 'dracula',
      label: 'Dracula',
      background: '#282a36',
      foreground: '#f2f8f8',
      primaryBackground: '#bd93f9',
      primaryForeground: '#ffffff',
      selection: '#bd93f922',
      tooltipBackground: '#08080a',
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
      tooltipBackground: '#2e3144',
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
      tooltipBackground: '#f9f9fa',
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
      tooltipBackground: '#fefefe',
      border: '#AEABAB',
      dark: false,
    },
  }

  static readonly DEFAULT_FONT: FontName = 'ia-writer-mono'

  static readonly fonts: Record<string, Font> = {
    'system-ui': {
      label: 'System UI',
      value: 'system-ui',
    },
    merriweather: {
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
    scientifica: {
      label: 'Scientifica',
      value: 'scientifica',
      regular: '/scientifica.ttf',
      bold: '/scientificaBold.ttf',
      italic: '/scientificaItalic.ttf',
      monospace: true,
    },
  }

  static readonly codeThemes: Record<string, CodeTheme> = {
    dracula: {
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
    aura: {
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

  static readonly BORDER_RADIUS_SMALL = '10px'
  static readonly BORDER_RADIUS = '20px'

  private saveConfigDebounced = debounce(100, (state) => this.saveConfig(state))

  constructor(
    private collabService: CollabService,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  get fontSize() {
    return this.store.config.fontSize
  }

  get typewriterMode() {
    return this.store.config.typewriterMode
  }

  get prettier() {
    return this.store.config.prettier
  }

  get codeTheme() {
    const currentCodeTheme = this.store.config.codeTheme
    return !currentCodeTheme
      ? ConfigService.getDefaltCodeTheme()
      : ConfigService.codeThemes[currentCodeTheme]
        ? ConfigService.codeThemes[currentCodeTheme]
        : ConfigService.getDefaltCodeTheme()
  }

  get font() {
    return (
      (this.store.config?.font ? ConfigService.fonts[this.store.config.font] : undefined) ??
      ConfigService.fonts[ConfigService.DEFAULT_FONT]
    )
  }

  get fontFamily() {
    return this.getFontFamily()
  }

  get theme() {
    return !this.store.config?.theme
      ? ConfigService.getDefaltTheme()
      : (ConfigService.themes[this.store.config.theme] ?? ConfigService.getDefaltTheme())
  }

  static getDefaltTheme() {
    return isDark() ? ConfigService.themes.dark : ConfigService.themes.light
  }

  static getDefaltCodeTheme(dark: boolean | undefined = undefined) {
    return (dark ?? isDark())
      ? ConfigService.codeThemes.dracula
      : ConfigService.codeThemes['material-light']
  }

  static getThemeConfig(state: State): Partial<Config> {
    const curTheme = ConfigService.themes[state.config.theme ?? -1]
    const dark = isDark()

    if (dark && (!curTheme || !curTheme.dark)) {
      return {theme: 'dark', codeTheme: 'tokyo-night'}
    } else if (!dark && (!curTheme || curTheme.dark)) {
      return {theme: 'light', codeTheme: 'material-light'}
    }

    return {}
  }

  getFontFamily = (
    options: {monospace?: boolean; bold?: boolean; italic?: boolean} = {},
  ): string => {
    const font = this.font
    if (options.monospace && !font?.monospace) {
      return ConfigService.fonts[ConfigService.DEFAULT_FONT].value
    } else if (options.bold && font?.bold) {
      return `${font.value} bold`
    } else if (options.italic && font?.italic) {
      return `${font.value} italic`
    }

    return font.value
  }

  async setAlwaysOnTop(alwaysOnTop: boolean) {
    await setAlwaysOnTop(alwaysOnTop)
    this.setState('config', {alwaysOnTop})
  }

  async updateConfig(conf: Partial<Config>) {
    this.collabService.setConfig(conf)
    const config = {...this.store.config, ...conf}
    this.setState('config', config)
    await this.saveConfig(this.store)
  }

  updateContentWidth(contentWidth: number) {
    this.collabService.setConfig({contentWidth})
    this.setState('config', 'contentWidth', contentWidth)
    void this.saveConfigDebounced(this.store)
  }

  async updateDarkMode() {
    const config = ConfigService.getThemeConfig(this.store)
    this.setState('config', config)
    await this.saveConfig(this.store)
  }

  private async saveConfig(state: State) {
    await DB.setConfig(state.config)
    info('Config saved')
  }
}
