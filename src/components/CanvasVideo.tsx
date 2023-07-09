import {css} from 'solid-styled-components'
import {CanvasVideoElement, ElementType, useState} from '@/state'
import Bounds from './Bounds'
import {onMount} from 'solid-js';

export default ({element, index}: {element: CanvasVideoElement; index: number}) => {
  let videoRef!: HTMLVideoElement
  const [, ctrl] = useState()

  const onSelect = () => {
    ctrl.canvas.select(element.id)
  }

  onMount(() => {
    ctrl.image.getImagePath(element.src).then((p) => {
      videoRef.setAttribute('src', p)
    })
  })

  return <>
    <Bounds
      id={element.id}
      elementType={ElementType.Video}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      selected={element.selected}
      onSelect={onSelect}
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
