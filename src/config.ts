import {Config} from '.'

interface Font {
  label: string;
  src?: string;
}

export const fonts: {[key: string]: Font} = {
  'merriweather': {
    label: 'Merriweather',
    src: './fonts/Merriweather-Regular.ttf',
  },
  'times-new-roman': {
    label: 'Times New Roman',
  },
  'roboto': {
    label: 'Roboto',
    src: './fonts/Roboto-Regular.ttf',
  },
  'roboto-slab': {
    label: 'Roboto Slab',
    src: './fonts/RobotoSlab-Regular.ttf',
  },
  'ibm-plex-serif': {
    label: 'IBM Plex Serif',
    src: './fonts/IBMPlexSerif-Regular.ttf',
  },
  'iosevka-term-slab': {
    label: 'Iosevka Term Slab',
    src: './fonts/iosevka-term-slab-regular.woff2',
  },
  'fantasque-sans-mono': {
    label: 'Fantasque Sans Mono',
    src: './fonts/FantasqueSansMono-Regular.woff2',
  },
}

interface Theme {
  label: string;
  background: string;
  color: string | string[];
}

export const themes: {[key: string]: Theme} = {
  'light': {
    label: 'Light',
    background: '255, 255, 255',
    color: '74, 74, 74',
  },
  'dark': {
    label: 'Dark',
    background: '22, 22, 26',
    color: '148, 161, 178',
  },
  'gruvbox-dark': {
    label: 'Gruvbox Dark',
    background: '50, 48, 47',
    color: '223, 191, 142'
  },
  'solarized-light': {
    label: 'Solarized Light',
    background: '253, 246, 227',
    color: '101, 123, 131',
  },
  'solarized-dark': {
    label: 'Solarized Dark',
    background: '0, 43, 54',
    color: '131, 148, 150'
  },
  'viola': {
    label: 'Viola',
    background: '48, 36, 61',
    color: '146, 123, 171',
  },
  'hibernus': {
    label: 'Hibernus',
    background: '244, 246, 246',
    color: '144, 166, 166',
  },
}

export const codeThemes = {
  'cobalt': {
    label: 'Cobalt',
    value: 'cobalt',
  },
  'dracula': {
    label: 'Dracula',
    value: 'dracula',
  },
  'material': {
    label: 'Material',
    value: 'material',
  },
  'nord': {
    label: 'Nord',
    value: 'nord',
  },
  'solarized-dark': {
    label: 'Solarized Dark',
    value: 'solarized dark',
  },
  'solarized-light': {
    label: 'Solarized Light',
    value: 'solarized light',
  },
}

export const background = (config: Config) =>
  themes[config.theme] ? themes[config.theme].background : themes.light.background

export const color = (config: Config) =>
  themes[config.theme] ? themes[config.theme].color : themes.light.color

export const font = (config: Config) =>
  fonts[config.font] ? fonts[config.font].label : 'Merriweather'

export const codeTheme = (config: Config) =>
  codeThemes[config.codeTheme] ? codeThemes[config.codeTheme].value : 'dracula'
