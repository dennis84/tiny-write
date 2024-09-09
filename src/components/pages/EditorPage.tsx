import {RouteSectionProps} from '@solidjs/router'
import {onMount, Show} from 'solid-js'
import {Mode, useState} from '@/state'
import {Loading} from './Loading'
import {Title} from './Title'
import {Editor} from '../editor/Editor'

export const EditorPage = (props: RouteSectionProps) => {
  const OpenEditor = () => {
    const {store, editorService, fileService} = useState()
    onMount(async () => {
      const share = props.location.query.share === 'true'
      await editorService.openFile(props.params.id, share)
      fileService.currentFile?.editorView?.focus()
    })

    return (
      <Show
        fallback={<Loading />}
        when={store.collab?.id === props.params.id && store.mode === Mode.Editor}
      >
        <Title />
        <Editor />
      </Show>
    )
  }

  return (
    <Show when={props.params.id} keyed>
      <OpenEditor />
    </Show>
  )
}
