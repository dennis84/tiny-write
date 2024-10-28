import {RouteSectionProps, useLocation} from '@solidjs/router'
import {onMount, Show} from 'solid-js'
import {LocationState, Mode, useState} from '@/state'
import {info} from '@/remote'
import {locationToString} from '@/utils/debug'
import {Loading} from './Loading'
import {Title} from './Title'
import {CodeEditor} from '../code/CodeEditor'

export const CodePage = (props: RouteSectionProps) => {
  const location = useLocation<LocationState>()

  const OpenCodeEditor = () => {
    const {store, codeService, fileService} = useState()

    info(`Open code page (location=${locationToString(props.location)})`)

    onMount(async () => {
      const share = props.location.query.share === 'true'
      await codeService.openFile({
        id: props.params.id,
        share,
        file: location.state?.file,
        newFile: location.state?.newFile,
        selection: location.state?.selection,
      })

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
    <Show when={props.params.id && location.state} keyed>
      <OpenCodeEditor />
    </Show>
  )
}
