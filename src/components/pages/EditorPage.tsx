import type {RouteSectionProps} from '@solidjs/router'
import {onMount, Show} from 'solid-js'
import {info} from '@/remote/log'
import {useState} from '@/state'
import {locationToString} from '@/utils/debug'
import {Editor} from '../editor/Editor'
import {Loading} from './Loading'
import {Title} from './Title'

export const EditorPage = (props: RouteSectionProps) => {
  const OpenEditor = () => {
    const {store, editorService, fileService} = useState()

    info(`Open editor page (location=${locationToString(props.location)})`)

    onMount(async () => {
      const share = props.location.query.share === 'true'
      await editorService.openFile({
        id: props.params.id,
        share,
      })

      fileService.currentFile?.editorView?.focus()
    })

    return (
      <Show fallback={<Loading />} when={store.collab?.id === props.params.id}>
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
