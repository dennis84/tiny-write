import {onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {CanvasImageElement, useState} from '@/state'
import {Selection} from '@/services/CanvasService'
import {Bounds} from './Bounds'
import {LinkHandles} from './LinkHandles'
import {IndexType, zIndex} from '@/utils/z-index'
import {isTauri} from '@/env'

const CanvasImage = styled('img')((props: any) => `
  position: absolute;
  border-radius: var(--border-radius);
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
  ${props.selected && `
    box-shadow: 0 0 0 5px var(--border);
  `}
`)

export const Image = ({element, index}: {element: CanvasImageElement; index: number}) => {
  let imageRef!: HTMLImageElement
  const [, ctrl] = useState()

  const onSelect = (e: MouseEvent) => {
    ctrl.canvas.select(element.id, false, e.shiftKey)
  }

  const createSelection = (): Selection => {
    const box = ctrl.canvas.createBox(element)
    return {box, elements: [[element.id, box]]}
  }

  onMount(async () => {
    if (isTauri()) {
      const basePath = await ctrl.app.getBasePath()
      const p = await ctrl.media.getImagePath(element.src, basePath)
      imageRef.setAttribute('src', p)
    } else {
      imageRef.setAttribute('src', element.src)
    }
  })

  return (
    <>
      <Bounds selection={createSelection()} selected={element.selected} onSelect={onSelect} index={index} />
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
          'left': `${element.x.toString()}px`,
          'top': `${element.y.toString()}px`,
          'z-index': `${zIndex(index, IndexType.CONTENT)}`,
        }}
      />
    </>
  )
}
