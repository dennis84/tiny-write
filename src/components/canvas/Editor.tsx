import {createEffect, onCleanup, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import * as remote from '@/remote'
import {CanvasEditorElement, useState} from '@/state'
import {Selection} from '@/services/CanvasService'
import {FileService} from '@/services/FileService'
import {BlockHandle} from '@/components/editor/BlockHandle'
import {CanvasEditor} from '@/components/editor/Style'
import {Scroll} from '@/components/Layout'
import {Bounds} from './Bounds'
import {LinkHandles} from './LinkHandles'
import {IndexType, ZIndex} from '@/utils/ZIndex'

const EditorScroll = styled(Scroll)(
  (props: any) => `
    position: absolute;
    border-radius: var(--border-radius);
    user-select: none;
    pointer-events: none;
    box-shadow: 0 0 0 2px var(--border);
    ${props.selected ? `
      box-shadow: 0 0 0 5px var(--border);
    ` : ''}
    ${props.active ? `
      box-shadow: 0 0 0 5px var(--primary-background);
      user-select: auto;
      pointer-events: auto;
    ` : ''}
    ${props.deleted ? `
      opacity: 0.4;
    ` : ''}
  `,
)

export const Editor = ({element, index}: {element: CanvasEditorElement; index: number}) => {
  const [store, ctrl] = useState()
  let containerRef!: HTMLDivElement
  let editorRef!: HTMLDivElement

  const onSelect = (e: MouseEvent) => {
    ctrl.canvas.select(element.id, false, e.shiftKey)
  }

  const onDoubleClick = () => {
    ctrl.canvas.select(element.id, true)
  }

  const isDeleted = () => store.files.find((f) => f.id === element.id)?.deleted

  const createSelection = (): Selection => {
    const box = ctrl.canvas.createBox(element)
    return {box, elements: [[element.id, box]]}
  }

  createEffect(async () => {
    const currentCanvas = ctrl.canvas.currentCanvas
    let file = ctrl.file.findFileById(element.id)

    if (!file) {
      remote.info('No file for editor element', element.id)
      file = FileService.createFile({id: element.id, parentId: currentCanvas?.id})
      await ctrl.file.addFile(file)
    }

    const provider = ctrl.collab.getProvider(file.id)
    if (!provider) {
      ctrl.collab.init(file)
    }

    if (provider && file.editorView === undefined) {
      ctrl.editor.renderEditor(file, editorRef!)
    }
  })

  onCleanup(() => {
    ctrl.file.destroy(element.id)
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
      <EditorScroll
        ref={containerRef}
        selected={element.selected}
        active={element.active}
        deleted={isDeleted()}
        style={{
          'left': `${element.x}px`,
          'top': `${element.y}px`,
          'width': `${element.width}px`,
          'min-height': `${element.height}px`,
          'max-height': `${element.height}px`,
          'z-index': `${ZIndex.element(index, IndexType.CONTENT)}`,
        }}
      >
        <CanvasEditor config={store.config} ref={editorRef} data-testid="canvas_editor" />
        <BlockHandle file={ctrl.file.findFileById(element.id)} mouseMoveArea={() => containerRef} />
      </EditorScroll>
    </>
  )
}
