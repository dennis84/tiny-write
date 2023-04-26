import {CanvasEditorElement, useState} from '@/state'
import {onCleanup, onMount} from 'solid-js'
import {CanvasEditor} from './Editor'
import {Scroll} from './Layout'

export default ({element}: {element: CanvasEditorElement}) => {
  const [store, ctrl] = useState()
  let editorRef: HTMLDivElement | undefined

  onMount(() => {
    ctrl.canvas.renderEditor(element, editorRef!)
  })

  onCleanup(() => {
    ctrl.canvas.destroyElement(element.id)
  })

  return (
    <Scroll
      style={{
        position: 'absolute',
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        'min-height': 'auto',
        'min-width': 'auto',
        'box-shadow': '0 0 0 2px var(--primary-background)',
        'border-radius': '5px',
      }}
    >
      <CanvasEditor
        config={store.config}
        markdown={false}
        ref={editorRef}
      ></CanvasEditor>
    </Scroll>
  )
}
