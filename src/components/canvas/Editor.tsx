import {onCleanup, onMount, Show} from 'solid-js'
import {css} from 'solid-styled-components'
import {CanvasEditorElement, useState} from '@/state'
import {Selection} from '@/services/CanvasService'
import {CanvasEditor} from '@/components/editor/Style'
import {Scroll} from '@/components/Layout'
import Bounds from './Bounds'
import LinkHandles from './LinkHandles'
import {IndexType, zIndex} from '@/utils/z-index'

export default ({element, index}: {element: CanvasEditorElement; index: number}) => {
  const [store, ctrl] = useState()
  let containerRef!: HTMLDivElement
  let editorRef!: HTMLDivElement

  const onSelect = (e: MouseEvent) => {
    ctrl.canvas.select(element.id, false, e.shiftKey)
  }

  const onDoubleClick = () => {
    ctrl.canvas.select(element.id, true)
  }

  const isDeleted = () =>
    store.files.find((f) => f.id === element.id)?.deleted

  const createSelection = (): Selection => {
    const box = ctrl.canvas.createBox(element)
    return {box, elements: [[element.id, box]]}
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
          selection={createSelection()}
          selected={element.selected}
          onSelect={onSelect}
          onDoubleClick={onDoubleClick}
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
      </Show>
      <Scroll
        ref={containerRef}
        class={css`
          position: absolute;
          left: ${element.x.toString()}px;
          top: ${element.y.toString()}px;
          width: ${element.width.toString()}px;
          min-height: ${element.height.toString()}px;
          max-height: ${element.height.toString()}px;
          border-radius: var(--border-radius);
          z-index: ${zIndex(index, IndexType.CONTENT)};
          user-select: none;
          pointer-events: none;
          ${element.active ? `
            box-shadow: 0 0 0 5px var(--primary-background);
            user-select: auto;
            pointer-events: auto;
          ` : element.selected ? `
            box-shadow: 0 0 0 5px var(--border);
          ` : isDeleted() ? `
            opacity: 0.4;
            box-shadow: 0 0 0 2px var(--border);
          ` : `
            box-shadow: 0 0 0 2px var(--border);
          `}
        `}
      >
        <CanvasEditor
          config={store.config}
          markdown={false}
          ref={editorRef}
          data-testid="canvas_editor"
        />
      </Scroll>
    </>
  )
}
