import {Config} from '@/state'
import {isDark} from '@/env'

interface Font {
  label: string;
  regular?: string;
  bold?: string;
  italic?: string;
  monospace?: boolean;
}

export const fonts: {[key: string]: Font} = {
  'merriweather': {
    label: 'Merriweather',
    regular: '/Merriweather-Regular.ttf',
    bold: '/Merriweather-Black.ttf',
    italic: '/Merriweather-Italic.ttf',
  },
  'ibm-plex-sans': {
    label: 'IBM Plex Sans',
    regular: '/IBMPlexSans-Regular.woff2',
    bold: '/IBMPlexSans-Bold.woff2',
    italic: '/IBMPlexSans-Italic.woff2',
  },
  'ibm-plex-serif': {
    label: 'IBM Plex Serif',
    regular: '/IBMPlexSerif-Regular.woff2',
    bold: '/IBMPlexSerif-Bold.woff2',
    italic: '/IBMPlexSerif-Italic.woff2',
  },
  'jetbrains-mono': {
    label: 'JetBrains Mono',
    regular: '/JetBrainsMono-ExtraLight.woff2',
    bold: '/JetBrainsMono-Bold.woff2',
    italic: '/JetBrainsMono-Italic.woff2',
    monospace: true,
  },
  'fantasque-sans-mono': {
    label: 'Fantasque Sans Mono',
    regular: '/FantasqueSansMono-Regular.woff2',
    bold: '/FantasqueSansMono-Bold.woff2',
    italic: '/FantasqueSansMono-Italic.woff2',
    monospace: true,
  },
  'ia-writer-mono': {
    label: 'iA Writer Mono',
    regular: '/iAWriterMonoS-Regular.woff2',
    bold: '/iAWriterMonoS-Bold.woff2',
    italic: '/iAWriterMonoS-Italic.ttf',
    monospace: true,
  },
  'scientifica': {
    label: 'Scientifica',
    regular: '/scientifica.ttf',
    bold: '/scientificaBold.ttf',
    italic: '/scientificaItalic.ttf',
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
    foreground: '#dadfe5',
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
  'tokyo-night': {
    value: 'tokyo-night',
    label: 'Tokyo Night',
    background: '#1a1b26',
    foreground: '#c0caf5',
    primaryBackground: '#9ece6a',
    primaryForeground: '#fff',
    selection: '#c0caf522',
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
  dark: boolean;
}

export const codeThemes: {[key: string]: CodeTheme} = {
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

export const font = (
  config: Config,
  options: {monospace?: boolean; bold?: boolean; italic?: boolean} = {}
) => {
  const defaultFont = 'ia-writer-mono'
  if (options.monospace && !fonts[config.font]?.monospace) {
    return fonts[defaultFont].label
  } else if (options.bold && fonts[config.font]?.bold) {
    return fonts[config.font].label + ' Bold'
  } else if (options.italic && fonts[config.font]?.italic) {
    return fonts[config.font].label + ' Italic'
  } else if (fonts[config.font]) {
    return fonts[config.font].label
  }

  return fonts[defaultFont].label
}

const getDefaltCodeTheme = () => isDark() ? codeThemes.dracula : codeThemes['material-light']

export const codeTheme = (config: Config) =>
  !config.codeTheme ? getDefaltCodeTheme() :
  codeThemes[config.codeTheme] ? codeThemes[config.codeTheme] :
  getDefaltCodeTheme()
