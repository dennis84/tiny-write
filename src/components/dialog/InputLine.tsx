import {onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {getTheme} from '@/codemirror/theme'
import {codeMirror} from '@/components/code/Style'
import {ConfigService} from '@/services/ConfigService'
import {useState} from '@/state'
import {InputLineEditor} from './InputLineEditor'

const Container = styled.div`
  width: 60vw;
  ${codeMirror}
  .cm-editor {
    border-radius: var(--border-radius);
    border: 2px solid var(--primary-background);
    box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.24);
    .cm-scroller {
      padding: 10px !important;
      &::before {
        content: "❯";
        color: var(--primary-background);
      }
    }
  }
`

export interface InputLineConfig {
  value: string
  onEnter: (lang: string) => void
  words?: string[]
  placeholder?: string
}

export const InputLine = (props: InputLineConfig) => {
  let ref!: HTMLDivElement

  const {configService} = useState()

  onMount(() => {
    let codeTheme = configService.codeTheme
    if (configService.theme.dark !== codeTheme.dark) {
      codeTheme = ConfigService.getDefaltCodeTheme(configService.theme.dark)
    }

    const editor = new InputLineEditor({
      doc: props.value,
      parent: ref,
      theme: getTheme(codeTheme.value),
      words: props.words,
      placeholder: props.placeholder,
      onEnter: (lang) => {
        props.onEnter(lang)
      },
    })

    editor.focus()

    onCleanup(() => {
      editor.destroy()
    })
  })

  return <Container ref={ref} data-testid="input_line" />
}
