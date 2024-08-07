import {onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {CanvasVideoElement, useState} from '@/state'
import {Selection} from '@/services/CanvasService'
import {Bounds} from './Bounds'
import {LinkHandles} from './LinkHandles'
import {IndexType, zIndex} from '@/utils/z-index'

const CanvasVideo = styled('video')(
  (props: any) => `
    position: absolute;
    border-radius: var(--border-radius);
    user-select: none;
    pointer-events: none;
    -webkit-user-select: none;
    ${props.selected ? `box-shadow: 0 0 0 5px var(--border);` : ''}
  `,
)

export const Video = ({element, index}: {element: CanvasVideoElement; index: number}) => {
  let videoRef!: HTMLVideoElement
  const [, ctrl] = useState()

  const onSelect = (e: MouseEvent) => {
    ctrl.canvas.select(element.id, false, e.shiftKey)
  }

  const createSelection = (): Selection => {
    const box = ctrl.canvas.createBox(element)
    return {box, elements: [[element.id, box]]}
  }

  onMount(async () => {
    const basePath = await ctrl.app.getBasePath()
    const p = await ctrl.media.getImagePath(element.src, basePath)
    videoRef.setAttribute('src', p)
  })

  return (
    <>
      <Bounds
        selection={createSelection()}
        selected={element.selected}
        onSelect={onSelect}
        index={index}
      />
      <LinkHandles
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        index={index}
      />
      <CanvasVideo
        autoplay
        loop={true}
        ref={videoRef}
        selected={element.selected}
        width={element.width}
        height={element.height}
        style={{
          'left': `${element.x.toString()}px`,
          'top': `${element.y.toString()}px`,
          'z-index': `${zIndex(index, IndexType.CONTENT)}`,
        }}
      />
    </>
  )
}
