import {Accessor, Setter, Show, createEffect, onCleanup} from 'solid-js'
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
    box-shadow: 5px 6px 0 0 #00000033;
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

interface Props {
  getter: Accessor<InputLineConfig | undefined>
  setter: Setter<InputLineConfig | undefined>
}

export const InputLine = (props: Props) => {
  let ref!: HTMLDivElement

  const {appService, configService} = useState()

  createEffect(() => {
    const config = props.getter()
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
        props.setter(undefined)
      },
      onClose: () => {
        props.setter(undefined)
      },
    })

    editor.focus()

    onCleanup(() => {
      editor.destroy()
    })
  })

  return (
    <Show when={props.getter() !== undefined}>
      <Portal mount={appService.layoutRef}>
        <Layer>
          <Container ref={ref} data-testid="input_line" />
        </Layer>
      </Portal>
    </Show>
  )
}
