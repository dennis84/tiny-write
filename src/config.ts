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

interface Theme {
  label: string;
  background: string;
  color: string;
  color2: string;
}

export const themes: {[key: string]: Theme} = {
  'light': {
    label: 'Light',
    background: '255, 255, 255',
    color: '74, 74, 74',
    color2: '133, 117, 255',
  },
  'dark': {
    label: 'Dark',
    background: '22, 22, 26',
    color: '148, 161, 178',
    color2: '104, 255, 184',
  },
  'gruvbox-dark': {
    label: 'Gruvbox Dark',
    background: '50, 48, 47',
    color: '223, 191, 142',
    color2: '215, 95, 95',
  },
  'solarized-light': {
    label: 'Solarized Light',
    background: '253, 246, 227',
    color: '101, 123, 131',
    color2: '42, 161, 152',
  },
  'solarized-dark': {
    label: 'Solarized Dark',
    background: '0, 43, 54',
    color: '131, 148, 150',
    color2: '203, 75, 22',
  },
  'material': {
    label: 'Material',
    background: '38, 50, 56',
    color: '146, 152, 155',
    color2: '137, 221, 255',
  },
  'hibernus': {
    label: 'Hibernus',
    background: '244, 246, 246',
    color: '144, 166, 166',
    color2: '254, 87, 146',
  },
  'soft-era': {
    label: 'Soft Era',
    background: '249, 245, 245',
    color: '186, 152, 156',
    color2: '184, 189, 232',
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
};

export const codeTheme = (config: Config) =>
  codeThemes[config.codeTheme] ? codeThemes[config.codeTheme].value : 'dracula'
