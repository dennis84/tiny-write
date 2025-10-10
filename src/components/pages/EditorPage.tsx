import {type RouteSectionProps, useLocation} from '@solidjs/router'
import {Match, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useOpen} from '@/hooks/open'
import {info} from '@/remote/log'
import {type LocationState, Page, useState} from '@/state'
import {ButtonPrimary} from '../Button'
import {Editor} from '../editor/Editor'
import {Loading} from './Loading'
import {Title} from './Title'

export const NewEditorPage = () => {
  const {fileService} = useState()
  const {openFile} = useOpen()
  const location = useLocation<LocationState>()

  const Center = styled('div')`
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
  `

  const onClick = async () => {
    const join = location.query?.join as string | undefined
    const newFile = await fileService.newFile({id: join})
    openFile(newFile, {share: join !== undefined})
  }

  return (
    <Center data-testid="new_editor_page">
      <Switch>
        <Match when={location.query.join}>
          {(id) => (
            <ButtonPrimary onClick={onClick} data-testid="join_editor">
              Join editor {id()}
            </ButtonPrimary>
          )}
        </Match>
        <Match when={true}>
          <ButtonPrimary onClick={onClick} data-testid="new_editor">
            New editor
          </ButtonPrimary>
        </Match>
      </Switch>
    </Center>
  )
}

export const EditorPage = (props: RouteSectionProps) => {
  const location = useLocation<LocationState>()
  const {store, appService, editorService, fileService, toastService} = useState()
  const {open} = useOpen()

  const OpenEditor = () => {
    info(`Render editor page (location=${JSON.stringify(props.location.state)})`)

    onMount(async () => {
      try {
        await editorService.init()
        fileService.currentFile?.editorView?.focus()
      } catch (e) {
        await appService.setLocation(undefined)
        const message = e instanceof Error ? e.message : String(e)
        toastService.open({message, duration: 10_000})
        open({page: Page.Editor})
      }
    })

    return (
      <>
        {/* Wait until collab is initialized */}
        <Show fallback={<Loading />} when={store.collab?.id === props.params.id}>
          <Title />
          <Editor />
        </Show>
      </>
    )
  }

  return (
    <>
      {/* Rerender if location changes */}
      {/* eslint-disable-next-line */}
      <Show
        when={props.params.id === store.location?.editorId && (location.state || !location.state)}
        keyed
      >
        <OpenEditor />
      </Show>
    </>
  )
}
