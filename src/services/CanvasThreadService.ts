import type {ModelMessage} from 'ai'
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
import type {CanvasService} from './CanvasService'
import type {FileService} from './FileService'

export class CanvasThreadService {
  constructor(
    private canvasService: CanvasService,
    private fileService: FileService,
  ) {}

  getMessages(elementId: string): ModelMessage[] {
    const currentCanvas = this.canvasService.currentCanvas
    const messages: ModelMessage[] = []

    if (!currentCanvas) return messages
    let curId: string | undefined = elementId

    while (curId) {
      const cur = currentCanvas.elements.find((el) => el.id === curId)
      const link = currentCanvas.elements.find((el) => isLinkElement(el) && el.to === curId) as
        | CanvasLinkElement
        | undefined

      if (isEditorElement(cur)) {
        const file = this.fileService.findFileById(cur.id)
        messages.push(
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
        messages.push(
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
        messages.push({
          role: 'user',
          content: [{type: 'file', mediaType: '', data: new URL(cur.src)}],
        })
      } else if (isVideoElement(cur)) {
        // not supported
      }

      curId = link?.from
    }

    messages.push({role: 'system', content: commonCanvasRulesPrompt})
    messages.push({role: 'system', content: commonRulesPrompt})

    return messages.reverse()
  }
}
