import {css} from 'solid-styled-components'
import {CanvasImageElement, useState} from '@/state'
import {Selection} from '@/services/CanvasService'
import Bounds from './Bounds'
import LinkHandles from './LinkHandles'
import {IndexType, zIndex} from '@/utils/z-index'

export default ({element, index}: {element: CanvasImageElement; index: number}) => {
  const [, ctrl] = useState()

  const onSelect = (e: MouseEvent) => {
    ctrl.canvas.select(element.id, false, e.shiftKey)
  }

  const createSelection = (): Selection => {
    const box = ctrl.canvas.createBox(element)
    return {box, elements: [[element.id, box]]}
  }

  return <>
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
    <img
      src={element.src}
      width={element.width}
      height={element.height}
      class={css`
        position: absolute;
        left: ${element.x.toString()}px;
        top: ${element.y.toString()}px;
        border-radius: 5px;
        user-select: none;
        z-index: ${zIndex(index, IndexType.CONTENT)};
        -webkit-user-select: none;
        pointer-events: none;
        ${element.selected ? `
          box-shadow: 0 0 0 5px var(--border);
        `: ''}
      `}
    />
  </>
}
