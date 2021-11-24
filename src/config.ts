import {Config} from '.'

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
  'times-new-roman': {
    label: 'Times New Roman',
  },
  'georgia': {
    label: 'Georgia',
  },
  'piazzolla': {
    label: 'Piazzolla',
    src: './Piazzolla-Regular.woff2',
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
  'fantasque-sans-mono': {
    label: 'Fantasque Sans Mono',
    src: './FantasqueSansMono-Regular.woff2',
    monospace: true,
  },
}

export type Rgb = [number, number, number]

interface Theme {
  label: string;
  background: string;
  foreground: string;
  primary: string;
  dark: boolean;
}

export const themes: {[key: string]: Theme} = {
  'light': {
    label: 'Light',
    background: '#ffffff',
    foreground: '#666666',
    primary: '#8575ff',
    dark: false,
  },
  'dark': {
    label: 'Dark',
    background: '#16161a',
    foreground: '#94a1b2',
    primary: '#68ffb8',
    dark: true,
  },
  'gruvbox-dark': {
    label: 'Gruvbox Dark',
    background: '#32302f',
    foreground: '#dfbf8e',
    primary: '#d75f5f',
    dark: true,
  },
  'solarized-light': {
    label: 'Solarized Light',
    background: '#fdf6e3',
    foreground: '#657b83',
    primary: '#2aa198',
    dark: false,
  },
  'solarized-dark': {
    label: 'Solarized Dark',
    background: '#002b36',
    foreground: '#839496',
    primary: '#cb4b16',
    dark: true,
  },
  'material': {
    label: 'Material',
    background: '#263238',
    foreground: '#92989b',
    primary: '#89ddff',
    dark: true,
  },
  'dracula': {
    label: 'Dracula',
    background: '#282a36',
    foreground: '#bd93f9',
    primary: '#ff79c6',
    dark: true,
  },
  'hibernus': {
    label: 'Hibernus',
    background: '#f4f6f6',
    foreground: '#90a6a6',
    primary: '#fe5792',
    dark: false,
  },
  'soft-era': {
    label: 'Soft Era',
    background: '#f9f5f5',
    foreground: '#ba989c',
    primary: '#b8bde8',
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

export const isDarkTheme = (config: Config) =>
  themes[config.theme] ? themes[config.theme].dark : false

export const background = (config: Config) =>
  themes[config.theme] ? themes[config.theme].background : themes.light.background

export const foreground = (config: Config) =>
  themes[config.theme] ? themes[config.theme].foreground : themes.light.foreground

export const primary = (config: Config) =>
  themes[config.theme] ? themes[config.theme].primary : themes.light.primary

export const font = (config: Config, monospace = false) => {
  if (monospace && !fonts[config.font]?.monospace) {
    return 'JetBrains Mono'
  } else if (!fonts[config.font]) {
    return 'Merriweather'
  }

  return fonts[config.font].label
}

export const codeTheme = (config: Config) =>
  codeThemes[config.codeTheme] ? codeThemes[config.codeTheme].value : 'dracula'
