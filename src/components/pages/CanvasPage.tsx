import {type RouteSectionProps, useLocation} from '@solidjs/router'
import {Match, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useOpen} from '@/hooks/open'
import {info} from '@/remote/log'
import {type LocationState, Page, useState} from '@/state'
import {ButtonPrimary} from '../Button'
import {Canvas} from '../canvas/Canvas'
import {Loading} from './Loading'
import {Title} from './Title'

export const NewCanvasPage = () => {
  const location = useLocation<LocationState | undefined>()
  const {canvasService} = useState()
  const {openFile} = useOpen()

  const Center = styled('div')`
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
  `

  const onClick = async () => {
    const join = location.query?.join as string | undefined
    const newCanvas = await canvasService.newCanvas({id: join})
    openFile(newCanvas, {share: join !== undefined})
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
  const {store, appService, canvasService, canvasCollabService, collabService, toastService} =
    useState()
  const {open} = useOpen()

  const OpenCanvas = () => {
    info(`Render canvas page (location=${JSON.stringify(location.state)})`)

    onMount(async () => {
      try {
        await canvasService.init()
        canvasCollabService.init()
        collabService.init()
      } catch (e) {
        await appService.setLocation(undefined)
        const message = e instanceof Error ? e.message : String(e)
        toastService.open({message, duration: 10_000})
        open({page: Page.Canvas})
      }
    })

    return (
      <>
        {/* Wait until collab is initialized */}
        <Show fallback={<Loading />} when={store.collab?.id === props.params.id}>
          <Title />
          <Canvas />
        </Show>
      </>
    )
  }

  return (
    <>
      {/* Rerender if location changes */}
      {/* eslint-disable-next-line */}
      <Show when={props.params.id && (location.state || !location.state)} keyed>
        <OpenCanvas />
      </Show>
    </>
  )
}
