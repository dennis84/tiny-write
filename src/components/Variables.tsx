import {createEffect, onMount} from 'solid-js'
import {ConfigService} from '@/services/ConfigService'
import {useState} from '@/state'
import {ZIndex} from '@/utils/ZIndex'
import {CURSOR_DEFAULT, CURSOR_GRAB, CURSOR_GRABBED, CURSOR_POINTER, CURSOR_TEXT} from './Cursors'

export const Variables = () => {
  const {configService} = useState()

  onMount(() => setupFonts())

  createEffect(() => {
    const root = document.documentElement

    root.style.setProperty('--background', configService.theme.background)
    root.style.setProperty('--background-60', `${configService.theme.background}99`)
    root.style.setProperty('--background-20', `${configService.theme.background}33`)
    root.style.setProperty('--foreground', configService.theme.foreground)
    root.style.setProperty('--foreground-80', `${configService.theme.foreground}cc`)
    root.style.setProperty('--foreground-60', `${configService.theme.foreground}99`)
    root.style.setProperty('--foreground-50', `${configService.theme.foreground}80`)
    root.style.setProperty('--foreground-40', `${configService.theme.foreground}66`)
    root.style.setProperty('--foreground-20', `${configService.theme.foreground}33`)
    root.style.setProperty('--foreground-10', `${configService.theme.foreground}1a`)
    root.style.setProperty('--foreground-5', `${configService.theme.foreground}0D`)
    root.style.setProperty('--primary-background', configService.theme.primaryBackground)
    root.style.setProperty('--primary-background-80', `${configService.theme.primaryBackground}cc`)
    root.style.setProperty('--primary-background-50', `${configService.theme.primaryBackground}80`)
    root.style.setProperty('--primary-background-20', `${configService.theme.primaryBackground}33`)
    root.style.setProperty('--primary-background-10', `${configService.theme.primaryBackground}1a`)
    root.style.setProperty('--primary-foreground', configService.theme.primaryForeground)
    root.style.setProperty('--selection-border', `${configService.theme.primaryBackground}44`)
    root.style.setProperty('--selection', configService.theme.selection)
    root.style.setProperty('--tooltip-background', configService.theme.tooltipBackground)
    root.style.setProperty('--border', configService.theme.border)
    root.style.setProperty('--border-30', `${configService.theme.border}4d`)
    root.style.setProperty('--border-20', `${configService.theme.border}33`)
    root.style.setProperty('--font-family', configService.fontFamily)
    root.style.setProperty(
      '--font-family-monospace',
      configService.getFontFamily({monospace: true}),
    )
    root.style.setProperty('--font-family-bold', configService.getFontFamily({bold: true}))
    root.style.setProperty('--font-family-italic', configService.getFontFamily({italic: true}))
    root.style.setProperty('--font-size', `${configService.fontSize}px`)
    root.style.setProperty('--font-size-h1', `${configService.fontSize * 1.8}px`)
    root.style.setProperty('--font-size-h2', `${configService.fontSize * 1.4}px`)
    root.style.setProperty('--font-size-h3', `${configService.fontSize * 1.2}px`)
    root.style.setProperty('--line-height', `${configService.fontSize * 1.6}px`)
    root.style.setProperty('--line-height-h1', `${configService.fontSize * 1.8 * 1.6}px`)
    root.style.setProperty('--border-radius', ConfigService.BORDER_RADIUS)
    root.style.setProperty('--border-radius-small', ConfigService.BORDER_RADIUS_SMALL)
    root.style.setProperty('--menu-font-family', ConfigService.DEFAULT_FONT)
    root.style.setProperty('--menu-font-family-bold', `${ConfigService.DEFAULT_FONT} bold`)
    root.style.setProperty('--menu-font-size', '14px')
    root.style.setProperty('--menu-line-height', `${15 * 1.6}px`)
    root.style.setProperty('--cursor-default', CURSOR_DEFAULT)
    root.style.setProperty('--cursor-pointer', CURSOR_POINTER)
    root.style.setProperty('--cursor-grab', CURSOR_GRAB)
    root.style.setProperty('--cursor-grabbed', CURSOR_GRABBED)
    root.style.setProperty('--cursor-text', CURSOR_TEXT)
    root.style.setProperty('--z-index-max', ZIndex.MAX)
    root.style.setProperty('--z-index-handle', ZIndex.HANDLE)
    root.style.setProperty('--z-index-tooltip', ZIndex.TOOLTIP)
    root.style.setProperty('--z-index-above-content', ZIndex.ABOVE_CONTENT)
  })

  return null
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
      src: url(/material-symbols.woff2) format('woff2');
    }
  `

  const style = document.createElement('style')
  style.textContent = styles
  document.head.append(style)
}
