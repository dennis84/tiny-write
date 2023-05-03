import {onCleanup, onMount, Show} from 'solid-js'
import {css} from 'solid-styled-components'
import {CanvasEditorElement, useState} from '@/state'
import {CanvasEditor} from './Editor'
import {Scroll} from './Layout'
import Bounds from './Bounds'

export default ({element}: {element: CanvasEditorElement}) => {
  const [store, ctrl] = useState()
  let containerRef!: HTMLDivElement
  let editorRef!: HTMLDivElement

  const onSelect = () => {
    ctrl.canvas.select(element.id)
  }

  const onDoubleClick = () => {
    ctrl.canvas.select(element.id, true)
  }

  onMount(() => {
    ctrl.canvas.renderEditor(element, editorRef!)
  })

  onCleanup(() => {
    ctrl.canvas.destroyElement(element.id)
  })

  return (
    <>
      <Show when={!element.active}>
        <Bounds
          id={element.id}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          onSelect={onSelect}
          onDoubleClick={onDoubleClick}
        />
      </Show>
      <Scroll
        ref={containerRef}
        class={css`
          position: absolute;
          left: ${element.x.toString()}px;
          top: ${element.y.toString()}px;
          width: ${element.width.toString()}px;
          min-height: ${element.height.toString()}px;
          border-radius: 5px;
          z-index: 1;
          ${element.selected ? `
            box-shadow: 0 0 0 5px var(--primary-background);
          ` : `
            box-shadow: 0 0 0 2px var(--primary-background-50);
            &:hover {
              box-shadow: 0 0 0 5px var(--primary-background-50);
            }
          `}
        `}
      >
        <CanvasEditor
          config={store.config}
          markdown={false}
          ref={editorRef}
        />
      </Scroll>
    </>
  )
}
