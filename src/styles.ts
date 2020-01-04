import * as FS from 'free-style'
import {Config} from '.'

export const freestyle = FS.create()

export const themes = {
  'light': {background: '255 255, 255', color: '74, 74, 74'},
  'sand': {background: '254, 246, 228', color: '23, 44, 102'},
  'dark': {background: '22, 22, 26', color: '148, 161, 178'},
  'sand dark': {background: '85, 66, 61', color: '255, 243, 236'},
  'solarized dark': {background: '0, 43, 54', color: '131, 148, 150'},
}

export const background = (config: Config) =>
  themes[config.theme] ? themes[config.theme].background : themes.light.background

export const color = (config: Config) =>
  themes[config.theme] ? themes[config.theme].color : themes.light.color

export const rgb = (str) => `rgb(${str})`
export const rgba = (str, alpha) => `rgba(${str}, ${alpha})`

freestyle.registerRule('@font-face', {
  'font-family': 'Iosevka Term Slab',
  'src': 'url(./fonts/iosevka-term-slab-regular.woff2)',
})

freestyle.registerRule('@font-face', {
  'font-family': 'Merriweather',
  'src': 'url(./fonts/Merriweather-Regular.ttf)',
})

freestyle.registerRule('@font-face', {
  'font-family': 'IBM Plex Serif',
  'src': 'url(./fonts/IBMPlexSerif-Regular.ttf)',
})

freestyle.registerRule('@font-face', {
  'font-family': 'Roboto',
  'src': 'url(./fonts/Roboto-Regular.ttf)',
})

freestyle.registerRule('@font-face', {
  'font-family': 'Roboto Slab',
  'src': 'url(./fonts/RobotoSlab-Regular.ttf)',
})
