import {type RouteSectionProps, useLocation} from '@solidjs/router'
import {onMount, Show} from 'solid-js'
import {info} from '@/remote/log'
import {type LocationState, useState} from '@/state'
import {locationToString} from '@/utils/debug'
import {CodeEditor} from '../code/CodeEditor'
import {MergeMenu} from '../code/MergeMenu'
import {Loading} from './Loading'
import {Title} from './Title'

export const CodePage = (props: RouteSectionProps) => {
  const location = useLocation<LocationState | undefined>()

  const OpenCodeEditor = () => {
    const {store, codeService, fileService} = useState()

    info(`Open code page (location=${locationToString(props.location)})`)

    onMount(async () => {
      const share = props.location.query.share === 'true'
      await codeService.openFile({
        id: props.params.id,
        share,
        selection: location.state?.selection,
        merge: location.state?.merge,
      })

      fileService.currentFile?.codeEditorView?.focus()
    })

    return (
      <Show fallback={<Loading />} when={store.collab?.id === props.params.id}>
        <Title />
        <CodeEditor />
        <MergeMenu />
      </Show>
    )
  }

  return (
    <>
      {/* eslint-disable-next-line */}
      <Show when={props.params.id && (location.state || !location.state)} keyed>
        <OpenCodeEditor />
      </Show>
    </>
  )
}
