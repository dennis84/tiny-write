import {CanvasEditorElement, useState} from '@/state'
import {onCleanup, onMount, Show} from 'solid-js'
import {css, styled} from 'solid-styled-components'
import {CanvasEditor} from './Editor'
import {Scroll} from './Layout'

export default ({element}: {element: CanvasEditorElement}) => {
  const [store, ctrl] = useState()
  let editorRef: HTMLDivElement | undefined

  const onSelect = () => {
    ctrl.canvas.select(element.id)
  }

  onMount(() => {
    ctrl.canvas.renderEditor(element, editorRef!)
  })

  onCleanup(() => {
    ctrl.canvas.destroyElement(element.id)
  })

  const Layer = styled('div')`
    position: absolute;
    background: #00000033;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 999;
  `

  return (
    <Scroll
      class={css`
        position: absolute;
        left: ${element.x.toString()}px;
        top: ${element.y.toString()}px;
        width: ${element.width.toString()}px;
        height: ${element.height.toString()}px;
        min-height: auto;
        min-width: auto;
        border-radius: 5px;
        ${element.selected ? `
          box-shadow: 0 0 0 5px var(--primary-background);
        ` : `
          cursor: grab;
          box-shadow: 0 0 0 2px var(--primary-background-50);
          &:hover {
            box-shadow: 0 0 0 5px var(--primary-background-50);
          }
        `}
      `}
    >
      <Show when={!element.selected}>
        <Layer onClick={onSelect} />
      </Show>
      <CanvasEditor
        config={store.config}
        markdown={false}
        ref={editorRef}
      ></CanvasEditor>
    </Scroll>
  )
}
