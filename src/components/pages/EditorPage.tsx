import {RouteSectionProps, useLocation} from '@solidjs/router'
import {onMount, Show} from 'solid-js'
import {LocationState, useState} from '@/state'
import {info} from '@/remote/log'
import {locationToString} from '@/utils/debug'
import {Loading} from './Loading'
import {Title} from './Title'
import {Editor} from '../editor/Editor'

export const EditorPage = (props: RouteSectionProps) => {
  const OpenEditor = () => {
    const {store, editorService, fileService} = useState()
    const location = useLocation<LocationState>()

    info(`Open editor page (location=${locationToString(props.location)})`)

    onMount(async () => {
      const share = props.location.query.share === 'true'
      await editorService.openFile({
        id: props.params.id,
        share,
        file: location.state?.file,
        newFile: location.state?.newFile,
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
