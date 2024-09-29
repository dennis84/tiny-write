import {createEffect, onCleanup, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {CanvasCodeElement, useState} from '@/state'
import * as remote from '@/remote'
import {Selection} from '@/services/CanvasService'
import {FileService} from '@/services/FileService'
import {Scroll} from '@/components/Layout'
import {CodeMirrorContainer} from '@/components/code/CodeEditor'
import {Bounds} from './Bounds'
import {LinkHandles} from './LinkHandles'
import {IndexType, ZIndex} from '@/utils/ZIndex'

// prettier-ignore
const CodeEditorScroll = styled(Scroll)(
  (props: any) => `
    position: absolute;
    border-radius: var(--border-radius);
    user-select: none;
    pointer-events: none;
    box-shadow: 0 0 0 2px var(--border);
    ${props.selected ? `box-shadow: 0 0 0 5px var(--border);` : ''}
    ${props.active ? `
      box-shadow: 0 0 0 5px var(--primary-background);
      user-select: auto;
      pointer-events: auto;
    ` : ''}
    ${props.deleted ? `opacity: 0.4;` : ''}
    .cm-scroller {
      padding: 20px;
    }
  `
)

export const CodeEditor = ({element, index}: {element: CanvasCodeElement; index: number}) => {
  const {canvasService, codeService, collabService, fileService} = useState()
  let containerRef!: HTMLDivElement
  let editorRef!: HTMLDivElement

  const onSelect = (e: MouseEvent) => {
    canvasService.select(element.id, false, e.shiftKey)
  }

  const onDoubleClick = () => {
    canvasService.select(element.id, true)
  }

  const isDeleted = () => fileService.findFileById(element.id)?.deleted

  const createSelection = (): Selection => {
    const box = canvasService.createBox(element)
    return {box, elements: [[element.id, box]]}
  }

  createEffect(async () => {
    const currentCanvas = canvasService.currentCanvas
    let file = fileService.findFileById(element.id)

    if (!file) {
      remote.info('No file for code element', element.id)
      file = FileService.createFile({id: element.id, parentId: currentCanvas?.id, code: true})
      await fileService.addFile(file)
    }

    const provider = collabService.getProvider(file.id)
    if (!provider) {
      collabService.initFile(file)
    }

    if (provider && file.codeEditorView === undefined) {
      codeService.renderEditor(file, editorRef)
    }
  })

  onCleanup(() => {
    fileService.destroy(element.id)
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
      <CodeEditorScroll
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
        <CodeMirrorContainer ref={editorRef} data-testid="canvas_code_editor" />
      </CodeEditorScroll>
    </>
  )
}
