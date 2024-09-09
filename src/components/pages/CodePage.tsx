import {RouteSectionProps} from '@solidjs/router'
import {onMount, Show} from 'solid-js'
import {Mode, useState} from '@/state'
import {Loading} from './Loading'
import {Title} from './Title'
import {CodeEditor} from '../code/CodeEditor'

export const CodePage = (props: RouteSectionProps) => {
  const OpenCodeEditor = () => {
    const {store, codeService, fileService} = useState()
    onMount(async () => {
      const share = props.location.query.share === 'true'
      await codeService.openFile(props.params.id, share)
      fileService.currentFile?.codeEditorView?.focus()
    })

    return (
      <Show
        fallback={<Loading />}
        when={store.collab?.id === props.params.id && store.mode === Mode.Code}
      >
        <Title />
        <CodeEditor />
      </Show>
    )
  }

  return (
    <Show when={props.params.id} keyed>
      <OpenCodeEditor />
    </Show>
  )
}
