import {onMount} from 'solid-js'
import {css} from 'solid-styled-components'
import {CanvasVideoElement, useState} from '@/state'
import {Selection} from '@/services/CanvasService'
import Bounds from './Bounds'
import LinkHandles from './LinkHandles'

export default ({element, index}: {element: CanvasVideoElement; index: number}) => {
  let videoRef!: HTMLVideoElement
  const [, ctrl] = useState()

  const onSelect = (e: MouseEvent) => {
    ctrl.canvas.select(element.id, false, e.shiftKey)
  }

  const createSelection = (): Selection => {
    const box = ctrl.canvas.createBox(element)
    return {box, elements: [[element.id, box]]}
  }

  onMount(() => {
    ctrl.image.getImagePath(element.src).then((p) => {
      videoRef.setAttribute('src', p)
    })
  })

  return <>
    <Bounds
      selection={createSelection()}
      selected={element.selected}
      onSelect={onSelect}
    />
    <LinkHandles
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
    />
    <video
      autoplay
      loop={true}
      width={element.width}
      height={element.height}
      ref={videoRef}
      class={css`
        position: absolute;
        left: ${element.x.toString()}px;
        top: ${element.y.toString()}px;
        border-radius: 5px;
        user-select: none;
        z-index: ${(index + 1).toString()};
        pointer-events: none;
        -webkit-user-select: none;
        ${element.selected ? `
          box-shadow: 0 0 0 5px var(--border);
        `: ''}
      `}
    />
  </>
}
