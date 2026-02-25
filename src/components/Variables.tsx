import {createMemo, onMount} from 'solid-js'
import {createGlobalStyles} from 'solid-styled-components'
import {getThemeConfig} from '@/codemirror/theme'
import {ConfigService} from '@/services/ConfigService'
import {useState} from '@/state'
import {ZIndex} from '@/utils/ZIndex'
import {CURSOR_DEFAULT, CURSOR_GRAB, CURSOR_GRABBED, CURSOR_POINTER, CURSOR_TEXT} from './Cursors'

export const Variables = () => {
  const {store, configService} = useState()

  onMount(() => {
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
  })

  const theme = createMemo(() => getThemeConfig(configService.codeTheme.value))

  const GlobalVariables = createGlobalStyles`
    :root {
      --foreground: ${() => configService.theme.foreground};
      --background: ${() => configService.theme.background};
      --background-0: rgb(from var(--background) r g b / 0);
      --background-5: color-mix(in srgb, var(--background) 5%, var(--foreground));
      --background-10: color-mix(in srgb, var(--background) 10%, var(--foreground));
      --background-20: color-mix(in srgb, var(--background) 20%, var(--foreground));
      --background-30: color-mix(in srgb, var(--background) 30%, var(--foreground));
      --background-40: color-mix(in srgb, var(--background) 40%, var(--foreground));
      --background-50: color-mix(in srgb, var(--background) 50%, var(--foreground));
      --background-60: color-mix(in srgb, var(--background) 60%, var(--foreground));
      --background-70: color-mix(in srgb, var(--background) 70%, var(--foreground));
      --background-80: color-mix(in srgb, var(--background) 80%, var(--foreground));
      --background-90: color-mix(in srgb, var(--background) 90%, var(--foreground));
      --background-95: color-mix(in srgb, var(--background) 95%, var(--foreground));
      --primary-foreground: ${() => configService.theme.primaryForeground};
      --primary-background: ${() => configService.theme.primaryBackground};
      --primary-background-10: color-mix(in srgb, var(--background), var(--primary-background) 10%);
      --primary-background-20: color-mix(in srgb, var(--background), var(--primary-background) 20%);
      --primary-background-30: color-mix(in srgb, var(--background), var(--primary-background) 30%);
      --primary-background-40: color-mix(in srgb, var(--background), var(--primary-background) 40%);
      --primary-background-50: color-mix(in srgb, var(--background), var(--primary-background) 50%);
      --primary-background-60: color-mix(in srgb, var(--background), var(--primary-background) 60%);
      --primary-background-70: color-mix(in srgb, var(--background), var(--primary-background) 70%);
      --primary-background-80: color-mix(in srgb, var(--background), var(--primary-background) 80%);
      --primary-background-90: color-mix(in srgb, var(--background), var(--primary-background) 90%);
      --selection-border: ${() => configService.theme.primaryBackground}44;
      --selection: ${() => configService.theme.selection};
      --tooltip-background: ${() => configService.theme.tooltipBackground};
      --border: ${() => configService.theme.border};
      --font-family: ${() => configService.fontFamily};
      --font-family-monospace: ${() => configService.getFontFamily({monospace: true})};
      --font-family-bold: ${() => configService.getFontFamily({bold: true})};
      --font-family-italic: ${() => configService.getFontFamily({italic: true})};
      --font-size: ${() => String(configService.fontSize)}px;
      --font-size-h1: ${() => String(configService.fontSize * 1.8)}px;
      --font-size-h2: ${() => String(configService.fontSize * 1.4)}px;
      --font-size-h3: ${() => String(configService.fontSize * 1.2)}px;
      --line-height: ${() => String(configService.fontSize * 1.6)}px;
      --line-height-h1: ${() => String(configService.fontSize * 1.8 * 1.6)}px;
      --border-radius: ${ConfigService.BORDER_RADIUS};
      --border-radius-small: ${ConfigService.BORDER_RADIUS_SMALL};
      --menu-font-family: ${ConfigService.DEFAULT_MENU_FONT};
      --menu-font-family-bold: ${ConfigService.DEFAULT_MENU_FONT} bold;
      --menu-font-size: 14px;
      --menu-line-height: ${String(15 * 1.6)}px;
      --cursor-default: ${CURSOR_DEFAULT};
      --cursor-pointer: ${CURSOR_POINTER};
      --cursor-grab: ${CURSOR_GRAB};
      --cursor-grabbed: ${CURSOR_GRABBED};
      --cursor-text: ${CURSOR_TEXT};
      --z-index-max: ${ZIndex.MAX};
      --z-index-dialog: ${ZIndex.DIALOG};
      --z-index-handle: ${ZIndex.HANDLE};
      --z-index-above-content: ${ZIndex.ABOVE_CONTENT};
      --content-width: ${() => String(store.config.contentWidth)}px;
      --code-background: ${() => theme().background};
    }

    @keyframes fadeIn {
      to {
        opacity: 1;
      }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `

  return <GlobalVariables />
}
