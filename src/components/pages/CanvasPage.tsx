import type {RouteSectionProps} from '@solidjs/router'
import {onMount, Show} from 'solid-js'
import {info} from '@/remote/log'
import {useState} from '@/state'
import {locationToString} from '@/utils/debug'
import {Canvas} from '../canvas/Canvas'
import {Loading} from './Loading'
import {Title} from './Title'

export const CanvasPage = (props: RouteSectionProps) => {
  const OpenCanvas = () => {
    const {store, canvasService, canvasCollabService, collabService} = useState()

    info(`Open canvas page (location=${locationToString(props.location)})`)

    onMount(async () => {
      const share = props.location.query.share === 'true'
      await canvasService.open(props.params.id, share)
      canvasCollabService.init()
      collabService.init()
    })

    return (
      <Show fallback={<Loading />} when={store.collab?.id === props.params.id}>
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
