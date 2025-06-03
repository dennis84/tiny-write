import {onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {type CanvasImageElement, useState} from '@/state'
import type {Selection} from '@/services/CanvasService'
import {Bounds} from './Bounds'
import {LinkHandles} from './LinkHandles'
import {IndexType, ZIndex} from '@/utils/ZIndex'
import {isTauri} from '@/env'
import {MediaService} from '@/services/MediaService'

const CanvasImage = styled('img')(
  (props: any) => `
    position: absolute;
    border-radius: var(--border-radius);
    user-select: none;
    -webkit-user-select: none;
    pointer-events: none;
    ${props.selected ? `box-shadow: 0 0 0 5px var(--border);` : ''}
  `,
)

export const Image = ({element, index}: {element: CanvasImageElement; index: number}) => {
  let imageRef!: HTMLImageElement
  const {appService, canvasService} = useState()

  const onSelect = (e: MouseEvent) => {
    canvasService.select(element.id, false, e.shiftKey)
  }

  const createSelection = (): Selection => {
    const box = canvasService.createBox(element)
    return {box, elements: [[element.id, box]]}
  }

  onMount(async () => {
    if (isTauri()) {
      const basePath = await appService.getBasePath()
      const p = await MediaService.getImagePath(element.src, basePath)
      imageRef.setAttribute('src', p)
    } else {
      imageRef.setAttribute('src', element.src)
    }
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
      <CanvasImage
        ref={imageRef}
        width={element.width}
        height={element.height}
        selected={element.selected}
        style={{
          left: `${element.x.toString()}px`,
          top: `${element.y.toString()}px`,
          'z-index': `${ZIndex.element(index, IndexType.CONTENT)}`,
        }}
      />
    </>
  )
}
