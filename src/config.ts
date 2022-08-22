import {Config} from './state'
import {isDark} from './env'

interface Font {
  label: string;
  src?: string;
  monospace?: boolean;
}

export const fonts: {[key: string]: Font} = {
  'merriweather': {
    label: 'Merriweather',
    src: './Merriweather-Regular.ttf',
  },
  'ibm-plex-sans': {
    label: 'IBM Plex Sans',
    src: './IBMPlexSans-Regular.woff2',
  },
  'ibm-plex-serif': {
    label: 'IBM Plex Serif',
    src: './IBMPlexSerif-Regular.ttf',
  },
  'roboto-slab': {
    label: 'Roboto Slab',
    src: './RobotoSlab-Regular.ttf',
  },
  'jetbrains-mono': {
    label: 'JetBrains Mono',
    src: './JetBrainsMono-Regular.woff2',
    monospace: true,
  },
  'jetbrains-mono-extralight': {
    label: 'JetBrains Mono ExtraLight',
    src: './JetBrainsMono-ExtraLight.woff2',
    monospace: true,
  },
  'fantasque-sans-mono': {
    label: 'Fantasque Sans Mono',
    src: './FantasqueSansMono-Regular.woff2',
    monospace: true,
  },
  'ia-writer-mono': {
    label: 'iA Writer Mono',
    src: './iAWriterMonoS-Regular.woff2',
    monospace: true,
  },
}

interface Theme {
  value: string;
  label: string;
  background: string;
  foreground: string;
  primaryForeground: string;
  primaryBackground: string;
  selection: string;
  dark: boolean;
}

export const themes: {[key: string]: Theme} = {
  'light': {
    value: 'light',
    label: 'Light',
    background: '#ffffff',
    foreground: '#666666',
    primaryBackground: '#0000EE',
    primaryForeground: '#fff',
    selection: '#80CBC440',
    dark: false,
  },
  'dark': {
    value: 'dark',
    label: 'Dark',
    background: '#16161a',
    foreground: '#94a1b2',
    primaryBackground: '#68ffb8',
    primaryForeground: '#32825B',
    selection: '#3d375e7f',
    dark: true,
  },
  'gruvbox-dark': {
    value: 'gruvbox-dark',
    label: 'Gruvbox Dark',
    background: '#32302f',
    foreground: '#dfbf8e',
    primaryBackground: '#d75f5f',
    primaryForeground: '#fff',
    selection: '#504945d0',
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
    dark: false,
  },
  'solarized-dark': {
    value: 'solarized-dark',
    label: 'Solarized Dark',
    background: '#002b36',
    foreground: '#839496',
    primaryBackground: '#cb4b16',
    primaryForeground: '#fff',
    selection: '#ffffff11',
    dark: true,
  },
  'material': {
    value: 'material',
    label: 'Material',
    background: '#263238',
    foreground: '#92989b',
    primaryBackground: '#89ddff',
    primaryForeground: '#005f85',
    selection: '#80CBC420',
    dark: true,
  },
  'dracula': {
    value: 'dracula',
    label: 'Dracula',
    background: '#282a36',
    foreground: '#bd93f9',
    primaryBackground: '#ff79c6',
    primaryForeground: '#fff',
    selection: '#bd93f922',
    dark: true,
  },
  'hibernus': {
    value: 'hibernus',
    label: 'Hibernus',
    background: '#f4f6f6',
    foreground: '#90a6a6',
    primaryBackground: '#fe5792',
    primaryForeground: '#fff',
    selection: '#169fb133',
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
    dark: false,
  },
}

interface CodeTheme {
  label: string;
  value: string;
}

export const codeThemes: {[key: string]: CodeTheme} = {
  'dracula': {
    label: 'Dracula',
    value: 'dracula',
  },
  'material-dark': {
    label: 'Material Dark',
    value: 'material-dark',
  },
  'material-light': {
    label: 'Material Light',
    value: 'material-light',
  },
  'solarized-dark': {
    label: 'Solarized Dark',
    value: 'solarized-dark',
  },
  'solarized-light': {
    label: 'Solarized Light',
    value: 'solarized-light',
  },
  'github-light': {
    label: 'Github Light',
    value: 'github-light',
  },
  'github-dark': {
    label: 'Github Dark',
    value: 'github-dark',
  },
  'aura': {
    label: 'Aura Dark',
    value: 'aura',
  },
}

export const isDarkTheme = (config: Config) => getTheme(config).dark

const getDefaltTheme = () => isDark() ? themes.dark : themes.light
export const getTheme = (config: Config) =>
  !config.theme ? getDefaltTheme() :
  themes[config.theme] ?? getDefaltTheme()

export const background = (config: Config) => getTheme(config).background
export const foreground = (config: Config) => getTheme(config).foreground
export const primaryBackground = (config: Config) => getTheme(config).primaryBackground
export const primaryForeground = (config: Config) => getTheme(config).primaryForeground
export const selection = (config: Config) => getTheme(config).selection

export const font = (config: Config, monospace = false) => {
  const defaultFont = 'jetbrains-mono-extralight'
  if (monospace && !fonts[config.font]?.monospace) {
    return fonts[defaultFont].label
  } else if (!fonts[config.font]) {
    return fonts[defaultFont].label
  }

  return fonts[config.font].label
}

const getDefaltCodeTheme = () => isDark() ? codeThemes.dracula : codeThemes['material-light']

export const codeTheme = (config: Config) =>
  !config.codeTheme ? getDefaltCodeTheme().value :
  codeThemes[config.codeTheme] ? codeThemes[config.codeTheme].value :
  getDefaltCodeTheme().value
