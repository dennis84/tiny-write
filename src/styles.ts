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

export const button = {
  'height': '50px',
  'padding': '0 20px',
  'background': '#8575ff',
  'color': '#fff',
  'border-radius': '30px',
  'border': '0',
  'font-size': '18px',
  'cursor': 'pointer',
  'display': 'inline-flex',
  'justify-content': 'center',
  'align-items': 'center',
  'outline': 'none',
  'text-decoration': 'none',
  '&:hover': {
    'opacity': '0.8',
  }
}

export const buttonPrimary = freestyle.registerStyle(button)
