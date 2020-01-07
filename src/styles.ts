import * as FS from 'free-style'
import {fonts} from './config'

export const freestyle = FS.create()

export const rgb = (str) => `rgb(${str})`
export const rgba = (str, alpha) => `rgba(${str}, ${alpha})`

Object.entries(fonts).forEach(([key, value]) => {
  if (value.src) {
    freestyle.registerRule('@font-face', {
      'font-family': value.label,
      'src': `url(${value.src})`,
    })
  }
})
