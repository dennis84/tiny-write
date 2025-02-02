import {Show, createEffect, onCleanup} from 'solid-js'
import {Portal} from 'solid-js/web'
import {styled} from 'solid-styled-components'
import {getTheme} from '@/codemirror/theme'
import {LangInputEditor} from './InputLineEditor'
import {useState} from '@/state'
import {ConfigService} from '@/services/ConfigService'
import {codeMirror} from '@/components/code/Style'

const Layer = styled('div')`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
`

const Container = styled('div')`
  position: absolute;
  width: 50vw;
  margin-top: 10vh;
  z-index: 1000;
  ${codeMirror}
  .cm-editor {
    border-radius: var(--border-radius);
    border: 2px solid var(--primary-background);
    box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.24);
    .cm-scroller {
      padding: 10px !important;
      &::before {
        content: '❯';
        color: var(--primary-background);
      }
    }
  }
`

export interface InputLineConfig {
  value: string
  onEnter: (lang: string) => void
  words?: string[]
}

export const InputLine = () => {
  let ref!: HTMLDivElement

  const {appService, configService, inputLineService} = useState()

  createEffect(() => {
    const config = inputLineService.inputLine()
    if (config === undefined) return

    let codeTheme = configService.codeTheme
    if (configService.theme.dark !== codeTheme.dark) {
      codeTheme = ConfigService.getDefaltCodeTheme(configService.theme.dark)
    }

    const editor = new LangInputEditor({
      doc: config.value,
      parent: ref,
      theme: getTheme(codeTheme.value),
      words: config.words,
      onEnter: (lang) => {
        config.onEnter(lang)
        inputLineService.setInputLine(undefined)
      },
      onClose: () => {
        inputLineService.setInputLine(undefined)
      },
    })

    editor.focus()

    onCleanup(() => {
      editor.destroy()
    })
  })

  return (
    <Show when={inputLineService.inputLine() !== undefined}>
      <Portal mount={appService.layoutRef}>
        <Layer>
          <Container ref={ref} data-testid="input_line" />
        </Layer>
      </Portal>
    </Show>
  )
}
