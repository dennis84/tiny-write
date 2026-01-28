import {createResource, Show, Suspense} from 'solid-js'
import {styled} from 'solid-styled-components'
import {isTauri} from '@/env'
import type {Selection} from '@/services/CanvasService'
import {MediaService} from '@/services/MediaService'
import {useState} from '@/state'
import type {CanvasImageElement} from '@/types'
import {IndexType, ZIndex} from '@/utils/ZIndex'
import {Bounds} from './Bounds'
import {LinkHandles} from './LinkHandles'

const CanvasImage = styled('img')<{selected?: boolean}>`
  position: absolute;
  border-radius: var(--border-radius);
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
  ${(p) => (p.selected ? `box-shadow: 0 0 0 5px var(--border);` : '')}
`

export const Image = ({element, index}: {element: CanvasImageElement; index: number}) => {
  const {appService, canvasService} = useState()

  const onSelect = (e: MouseEvent) => {
    canvasService.select(element.id, false, e.shiftKey)
  }

  const createSelection = (): Selection => {
    const box = canvasService.createBox(element)
    return {box, elements: [[element.id, box]]}
  }

  const [source] = createResource(async () => {
    if (isTauri() && !element.src.startsWith('data:')) {
      const basePath = await appService.getBasePath()
      return await MediaService.getImagePath(element.src, basePath)
    } else {
      return element.src
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
      <Suspense>
        <Show when={source()}>
          {(src) => (
            <CanvasImage
              src={src()}
              width={element.width}
              height={element.height}
              selected={element.selected}
              style={{
                left: `${element.x.toString()}px`,
                top: `${element.y.toString()}px`,
                'z-index': `${ZIndex.element(index, IndexType.CONTENT)}`,
              }}
            />
          )}
        </Show>
      </Suspense>
    </>
  )
}
