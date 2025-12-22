import {type RouteSectionProps, useBeforeLeave, useLocation} from '@solidjs/router'
import {createResource, ErrorBoundary, Match, onMount, Show, Suspense, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useOpen} from '@/hooks/use-open'
import {info} from '@/remote/log'
import {type LocationState, Page, useState} from '@/state'
import {ButtonPrimary} from '../Button'
import {Editor} from '../editor/Editor'

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
  const {appService, collabService, editorService, fileService, toastService} = useState()
  const {open} = useOpen()

  info(`Render editor page (location=${JSON.stringify(props.location.state)})`)

  const [initialized] = createResource(
    () => ({id: props.params.id, state: props.location.state}),
    async (props) => {
      if (!props.id) return
      await editorService.init(props.id)
      fileService.currentFile?.editorView?.focus()
      return props
    },
  )

  const OnError = (p: {error: any}) => {
    onMount(async () => {
      await appService.setLocation(undefined)
      const message = p.error instanceof Error ? p.error.message : String(p.error)
      toastService.open({message, duration: 10_000})
      open({page: Page.Editor})
    })
    return null
  }

  useBeforeLeave(() => {
    const id = props.params.id
    if (!id) return
    fileService.destroy(id)
    collabService.destroy(id)
  })

  return (
    <Suspense>
      <ErrorBoundary fallback={(error) => <OnError error={error} />}>
        <Show when={initialized()} keyed>
          <Editor />
        </Show>
      </ErrorBoundary>
    </Suspense>
  )
}
