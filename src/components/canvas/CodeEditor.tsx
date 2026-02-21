import {createEffect, createResource, on, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {CodeMirrorContainer} from '@/components/code/CodeEditor'
import {CodeScroll} from '@/components/Layout'
import {info} from '@/remote/log'
import type {Selection} from '@/services/CanvasService'
import {FileService} from '@/services/FileService'
import {useState} from '@/state'
import type {CanvasCodeElement} from '@/types'
import {IndexType, ZIndex} from '@/utils/ZIndex'
import {Bounds} from './Bounds'
import {LinkHandles} from './LinkHandles'

interface CodeEditorScrollProps {
  selected?: boolean
  active?: boolean
  deleted?: boolean
}

// biome-ignore format: ternary breaks ugly
const CodeEditorScroll = styled(CodeScroll)<CodeEditorScrollProps>`
  position: absolute;
  border-radius: var(--border-radius);
  user-select: none;
  pointer-events: none;
  box-shadow: 0 0 0 2px var(--border);
  ${(p) => p.selected ? `box-shadow: 0 0 0 5px var(--border);` : ''}
  ${(p) => p.active ? `
    box-shadow: 0 0 0 5px var(--primary-background);
    user-select: auto;
    pointer-events: auto;
  ` : ''}
  ${(p) => p.deleted ? `opacity: 0.4;` : ''}
  .cm-scroller {
    padding: 20px 0 !important;
  }
`

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

  const [file] = createResource(
    () => ({id: element.id, canvasId: canvasService.currentCanvas?.id}),
    async ({id, canvasId}) => {
      let f = fileService.findFileById(id)

      if (!f) {
        info(`Create file for code editor element (id=${id})`)
        f = FileService.createFile({id, parentId: canvasId, code: true})
        await fileService.addFile(f)
      }

      return f
    },
  )

  createEffect(
    on(
      file,
      async () => {
        const f = file()
        if (!f) return
        await codeService.init(f.id, collabService.ydoc)
        codeService.renderEditor(f, editorRef)
      },
      {defer: true},
    ),
  )

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
          left: `${element.x}px`,
          top: `${element.y}px`,
          width: `${element.width}px`,
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
