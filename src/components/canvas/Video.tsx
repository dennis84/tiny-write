import {createResource, Show, Suspense} from 'solid-js'
import {styled} from 'solid-styled-components'
import type {Selection} from '@/services/CanvasService'
import {MediaService} from '@/services/MediaService'
import {useState} from '@/state'
import type {CanvasVideoElement} from '@/types'
import {IndexType, ZIndex} from '@/utils/ZIndex'
import {Bounds} from './Bounds'
import {LinkHandles} from './LinkHandles'

const CanvasVideo = styled.video<{selected?: boolean}>`
  position: absolute;
  border-radius: var(--border-radius);
  user-select: none;
  pointer-events: none;
  -webkit-user-select: none;
  ${(p) => (p.selected ? `box-shadow: 0 0 0 5px var(--border);` : '')}
`

export const Video = ({element, index}: {element: CanvasVideoElement; index: number}) => {
  const {appService, canvasService} = useState()

  const onSelect = (e: MouseEvent) => {
    canvasService.select(element.id, false, e.shiftKey)
  }

  const createSelection = (): Selection => {
    const box = canvasService.createBox(element)
    return {box, elements: [[element.id, box]]}
  }

  const [source] = createResource(async () => {
    const basePath = await appService.getBasePath()
    return MediaService.getImagePath(element.src, basePath)
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
            <CanvasVideo
              autoplay
              loop={true}
              src={src()}
              selected={element.selected}
              width={element.width}
              height={element.height}
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
