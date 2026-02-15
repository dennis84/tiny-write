import {type RouteSectionProps, useLocation} from '@solidjs/router'
import {createResource, ErrorBoundary, Match, onMount, Show, Suspense, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useBeforeLeave} from '@/hooks/use-before-leave'
import {info} from '@/remote/log'
import {useState} from '@/state'
import {type LocationState, Page} from '@/types'
import {locationStateToString} from '@/utils/debug'
import {ButtonPrimary} from '../Button'
import {CodeEditor} from '../code/CodeEditor'
import {MergeMenu} from '../code/MergeMenu'

export const NewCodePage = () => {
  const location = useLocation()
  const {fileService, locationService} = useState()

  const Center = styled('div')`
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
  `

  const onClick = async () => {
    const join = location.query?.join as string | undefined
    const newFile = await fileService.newFile({id: join, code: true})
    locationService.openItem(newFile, {share: join !== undefined})
  }

  return (
    <Center data-testid="new_code_page">
      <Switch>
        <Match when={location.query.join}>
          {(id) => (
            <ButtonPrimary onClick={onClick} data-testid="join_file">
              Join code file {id()}
            </ButtonPrimary>
          )}
        </Match>
        <Match when={true}>
          <ButtonPrimary onClick={onClick} data-testid="new_file">
            New code file
          </ButtonPrimary>
        </Match>
      </Switch>
    </Center>
  )
}

export const CodePage = (props: RouteSectionProps) => {
  const location = useLocation<LocationState | undefined>()
  const {store, locationService, collabService, codeService, fileService, toastService} = useState()

  info(`Render code page (location=${locationStateToString(location.state)})`)

  const [initialized] = createResource(
    // Reload when params.id or merge changes
    () =>
      JSON.stringify({
        id: props.params.id,
        merge: location.state?.merge,
      }),
    async (key) => {
      if (!props.params.id) return key
      await codeService.init(props.params.id)
      return key
    },
  )

  const OnError = (p: {error: any}) => {
    onMount(async () => {
      await locationService.setLastLocation(undefined)
      const message = p.error instanceof Error ? p.error.message : String(p.error)
      toastService.open({message, duration: 10_000})
      if (store.args?.cwd) {
        locationService.openDir()
      } else {
        locationService.openPage(Page.Code)
      }
    })
    return null
  }

  // Is called then leaving the page, also for navigating back
  // which is not triggered by useBeforeLeave
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
          <CodeEditor />
          <MergeMenu />
        </Show>
      </ErrorBoundary>
    </Suspense>
  )
}
