import {onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {type CanvasVideoElement, useState} from '@/state'
import type {Selection} from '@/services/CanvasService'
import {Bounds} from './Bounds'
import {LinkHandles} from './LinkHandles'
import {IndexType, ZIndex} from '@/utils/ZIndex'
import {MediaService} from '@/services/MediaService'

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
  const {appService, canvasService} = useState()

  const onSelect = (e: MouseEvent) => {
    canvasService.select(element.id, false, e.shiftKey)
  }

  const createSelection = (): Selection => {
    const box = canvasService.createBox(element)
    return {box, elements: [[element.id, box]]}
  }

  onMount(async () => {
    const basePath = await appService.getBasePath()
    const p = await MediaService.getImagePath(element.src, basePath)
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
          left: `${element.x.toString()}px`,
          top: `${element.y.toString()}px`,
          'z-index': `${ZIndex.element(index, IndexType.CONTENT)}`,
        }}
      />
    </>
  )
}
