import {css} from 'solid-styled-components'
import {CanvasImageElement, ElementType, useState} from '@/state'
import Bounds from './Bounds'

export default ({element, index}: {element: CanvasImageElement; index: number}) => {
  const [, ctrl] = useState()

  const onSelect = () => {
    ctrl.canvas.select(element.id)
  }

  return <>
    <Bounds
      id={element.id}
      elementType={ElementType.Image}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      selected={element.selected}
      onSelect={onSelect}
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
        z-index: ${(index + 1).toString()};
        -webkit-user-select: none;
        ${element.selected ? `
          box-shadow: 0 0 0 5px var(--border);
        `: ''}
      `}
    />
  </>
}
