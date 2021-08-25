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
  color: string;
  color2: string;
}

export const themes: {[key: string]: Theme} = {
  'light': {
    label: 'Light',
    background: '#ffffff',
    color: '#666666',
    color2: '#8575ff',
  },
  'dark': {
    label: 'Dark',
    background: '#16161a',
    color: '#94a1b2',
    color2: '#68ffb8',
  },
  'gruvbox-dark': {
    label: 'Gruvbox Dark',
    background: '#32302f',
    color: '#dfbf8e',
    color2: '#d75f5f',
  },
  'solarized-light': {
    label: 'Solarized Light',
    background: '#fdf6e3',
    color: '#657b83',
    color2: '#2aa198',
  },
  'solarized-dark': {
    label: 'Solarized Dark',
    background: '#002b36',
    color: '#839496',
    color2: '#cb4b16',
  },
  'material': {
    label: 'Material',
    background: '#263238',
    color: '#92989b',
    color2: '#89ddff',
  },
  'dracula': {
    label: 'Dracula',
    background: '#282a36',
    color: '#bd93f9',
    color2: '#ff79c6',
  },
  'hibernus': {
    label: 'Hibernus',
    background: '#f4f6f6',
    color: '#90a6a6',
    color2: '#fe5792',
  },
  'soft-era': {
    label: 'Soft Era',
    background: '#f9f5f5',
    color: '#ba989c',
    color2: '#b8bde8',
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
}

export const background = (config: Config) =>
  themes[config.theme] ? themes[config.theme].background : themes.light.background

export const color = (config: Config) =>
  themes[config.theme] ? themes[config.theme].color : themes.light.color

export const color2 = (config: Config) =>
  themes[config.theme] ? themes[config.theme].color2 : themes.light.color2

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
