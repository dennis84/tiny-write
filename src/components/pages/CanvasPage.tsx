import {RouteSectionProps} from '@solidjs/router'
import {onMount, Show} from 'solid-js'
import {Mode, useState} from '@/state'
import {Loading} from './Loading'
import {Title} from './Title'
import {Canvas} from '../canvas/Canvas'

export const CanvasPage = (props: RouteSectionProps) => {
  const OpenCanvas = () => {
    const [store, ctrl] = useState()
    onMount(async () => {
      const share = props.location.query.share === 'true'
      await ctrl.canvas.open(props.params.id, share)
      ctrl.canvasCollab.init()
      ctrl.collab.init()
    })

    return (
      <Show
        fallback={<Loading />}
        when={store.collab?.id === props.params.id && store.mode === Mode.Canvas}
      >
        <Title />
        <Canvas />
      </Show>
    )
  }

  return (
    <Show when={props.params.id} keyed>
      <OpenCanvas />
    </Show>
  )
}