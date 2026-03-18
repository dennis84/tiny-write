import {type RouteSectionProps, useLocation} from '@solidjs/router'
import {createResource, ErrorBoundary, Match, onMount, Show, Suspense, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useBeforeLeave} from '@/hooks/use-before-leave'
import {info} from '@/remote/log'
import {useState} from '@/state'
import {type LocationState, Page} from '@/types'
import {ButtonPrimary} from '../Button'
import {Canvas} from '../canvas/Canvas'

export const NewCanvasPage = () => {
  const location = useLocation()
  const {canvasService, locationService} = useState()

  const Center = styled.div`
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
  `

  const onClick = async () => {
    const join = location.query?.join as string | undefined
    const newCanvas = await canvasService.newCanvas({id: join})
    locationService.openItem(newCanvas, {share: join !== undefined})
  }

  return (
    <Center data-testid="new_canvas_page">
      <Switch>
        <Match when={location.query.join}>
          {(id) => (
            <ButtonPrimary onClick={onClick} data-testid="join_canvas">
              Join canvas {id()}
            </ButtonPrimary>
          )}
        </Match>
        <Match when={true}>
          <ButtonPrimary onClick={onClick} data-testid="new_canvas">
            New canvas
          </ButtonPrimary>
        </Match>
      </Switch>
    </Center>
  )
}

export const CanvasPage = (props: RouteSectionProps) => {
  const location = useLocation<LocationState | undefined>()
  const {locationService, canvasService, canvasCollabService, dialogService} = useState()

  info(`Render canvas page (location=${JSON.stringify(location.state)})`)

  const [initialized] = createResource(
    () => {
      if (canvasService.resourceState !== 'ready') return false
      return props.params.id
    },
    async (id) => {
      await canvasService.init()
      canvasCollabService.init()
      return id
    },
  )

  const OnError = (p: {error: any}) => {
    onMount(async () => {
      await locationService.setLastLocation(undefined)
      const message = p.error instanceof Error ? p.error.message : String(p.error)
      dialogService.toast({message, duration: 10_000})
      locationService.openPage(Page.Canvas)
    })
    return null
  }

  useBeforeLeave(() => {
    canvasService.destroy()
  })

  return (
    <Suspense>
      <ErrorBoundary fallback={(error) => <OnError error={error} />}>
        <Show when={initialized()} keyed>
          <Canvas />
        </Show>
      </ErrorBoundary>
    </Suspense>
  )
}
