import commonCanvasRulesPrompt from '@/prompts/canvas/common.md?raw'
import commonRulesPrompt from '@/prompts/common/rules.md?raw'
import {
  isCodeElement,
  isEditorElement,
  isImageElement,
  isLinkElement,
  isVideoElement,
} from '@/state'
import type {CanvasLinkElement} from '@/types'
import {MessageUtil} from '@/utils/MessageUtil'
import {ThreadContext} from '@/utils/ThreadContext'
import type {CanvasService} from './CanvasService'
import type {FileService} from './FileService'

export class CanvasThreadService {
  constructor(
    private canvasService: CanvasService,
    private fileService: FileService,
  ) {}

  getThreadContext(elementId: string): ThreadContext {
    const currentCanvas = this.canvasService.currentCanvas
    const context = new ThreadContext()

    if (!currentCanvas) return context
    let curId: string | undefined = elementId

    while (curId) {
      const cur = currentCanvas.elements.find((el) => el.id === curId)
      const link = currentCanvas.elements.find((el) => isLinkElement(el) && el.to === curId) as
        | CanvasLinkElement
        | undefined

      if (isEditorElement(cur)) {
        const file = this.fileService.findFileById(cur.id)
        context.addMessage(
          MessageUtil.toModelMessage(
            {
              id: cur.id,
              role: 'user',
              content: file?.editorView?.state.doc.textContent ?? '',
            },
            curId === elementId,
          ),
        )
      } else if (isCodeElement(cur)) {
        const file = this.fileService.findFileById(cur.id)
        context.addMessage(
          MessageUtil.toModelMessage(
            {
              id: cur.id,
              role: 'user',
              content: file?.codeEditorView?.state.doc.toString() ?? '',
            },
            curId === elementId,
          ),
        )
      } else if (isImageElement(cur)) {
        context.addMessage({
          role: 'user',
          content: [{type: 'file', mediaType: '', data: new URL(cur.src)}],
        })
      } else if (isVideoElement(cur)) {
        // not supported
      }

      curId = link?.from
    }

    context.addSystemMessage(commonRulesPrompt)
    context.addSystemMessage(commonCanvasRulesPrompt)

    // before: cur -> linkTo -> prev1 -> linkTo -> prev2
    // after: prev2, prev1, cur
    context.messages = context.messages.reverse()

    return context
  }
}
