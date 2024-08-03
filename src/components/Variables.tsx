import {createEffect, onMount} from 'solid-js'
import {ConfigService} from '@/services/ConfigService'
import {useState} from '@/state'
import {
  CURSOR_DEFAULT,
  CURSOR_GRAB,
  CURSOR_GRABBED,
  CURSOR_POINTER,
  CURSOR_TEXT,
} from './Cursors'

export const Variables = () => {
  const [, ctrl] = useState()

  onMount(() => setupFonts())

  createEffect(() => {
    const root = document.documentElement

    root.style.setProperty('--background', ctrl.config.theme.background)
    root.style.setProperty('--background-60', `${ctrl.config.theme.background}99`)
    root.style.setProperty('--foreground', ctrl.config.theme.foreground)
    root.style.setProperty('--foreground-80', `${ctrl.config.theme.foreground}cc`)
    root.style.setProperty('--foreground-60', `${ctrl.config.theme.foreground}99`)
    root.style.setProperty('--foreground-50', `${ctrl.config.theme.foreground}80`)
    root.style.setProperty('--foreground-20', `${ctrl.config.theme.foreground}33`)
    root.style.setProperty('--foreground-10', `${ctrl.config.theme.foreground}1a`)
    root.style.setProperty('--foreground-5', `${ctrl.config.theme.foreground}0D`)
    root.style.setProperty('--primary-background', ctrl.config.theme.primaryBackground)
    root.style.setProperty('--primary-background-80', `${ctrl.config.theme.primaryBackground}cc`)
    root.style.setProperty('--primary-background-50', `${ctrl.config.theme.primaryBackground}80`)
    root.style.setProperty('--primary-background-10', `${ctrl.config.theme.primaryBackground}1A`)
    root.style.setProperty('--primary-foreground', ctrl.config.theme.primaryForeground)
    root.style.setProperty('--selection-border', `${ctrl.config.theme.primaryBackground}44`)
    root.style.setProperty('--selection', ctrl.config.theme.selection)
    root.style.setProperty('--tooltip-background', ctrl.config.theme.tooltipBackground)
    root.style.setProperty('--border', ctrl.config.theme.border)
    root.style.setProperty('--border-30', `${ctrl.config.theme.border}4d`)
    root.style.setProperty('--border-20', `${ctrl.config.theme.border}33`)
    root.style.setProperty('--font-family', ctrl.config.fontFamily)
    root.style.setProperty('--font-family-monospace', ctrl.config.getFontFamily({monospace: true}))
    root.style.setProperty('--font-family-bold', ctrl.config.getFontFamily({bold: true}))
    root.style.setProperty('--font-family-italic', ctrl.config.getFontFamily({italic: true}))
    root.style.setProperty('--font-size', `${ctrl.config.fontSize}px`)
    root.style.setProperty('--font-size-h1', `${ctrl.config.fontSize * 1.8}px`)
    root.style.setProperty('--font-size-h2', `${ctrl.config.fontSize * 1.4}px`)
    root.style.setProperty('--font-size-h3', `${ctrl.config.fontSize * 1.2}px`)
    root.style.setProperty('--line-height', `${ctrl.config.fontSize * 1.6}px`)
    root.style.setProperty('--line-height-h1', `${ctrl.config.fontSize * 1.8 * 1.6}px`)
    root.style.setProperty('--border-radius', ConfigService.BORDER_RADIUS)
    root.style.setProperty('--menu-font-family', ConfigService.DEFAULT_FONT)
    root.style.setProperty('--menu-font-family-bold', ConfigService.DEFAULT_FONT + ' bold')
    root.style.setProperty('--menu-font-size', '14px')
    root.style.setProperty('--menu-line-height', `${15 * 1.6}px`)
    root.style.setProperty('--cursor-default', CURSOR_DEFAULT)
    root.style.setProperty('--cursor-pointer', CURSOR_POINTER)
    root.style.setProperty('--cursor-grab', CURSOR_GRAB)
    root.style.setProperty('--cursor-grabbed', CURSOR_GRABBED)
    root.style.setProperty('--cursor-text', CURSOR_TEXT)
  })

  return <></>
}

const setupFonts = () => {
  let styles = ''
  for (const k of Object.keys(ConfigService.fonts)) {
    const font = ConfigService.fonts[k]
    if (font.regular) {
      styles += `
        @font-face {
          font-family: '${font.value}';
          src: url('${font.regular}');
        }
      `
    }
    if (font.bold) {
      styles += `
        @font-face {
          font-family: '${font.value} bold';
          src: url('${font.bold}');
        }
      `
    }
    if (font.italic) {
      styles += `
        @font-face {
          font-family: '${font.value} italic';
          src: url('${font.italic}');
        }
      `
    }
  }

  styles += `
    @font-face {
      font-family: 'Material Symbols Outlined';
      font-style: normal;
      src: url(./material-symbols.woff2) format('woff2');
    }
  `

  const style = document.createElement('style')
  style.textContent = styles
  document.head.append(style)
}
