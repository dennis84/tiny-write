import * as FS from 'free-style'

export const freestyle = FS.create((x: string) => FS.stringHash(x))

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
