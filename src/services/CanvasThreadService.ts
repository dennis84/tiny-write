import commonCanvasRulesPrompt from '@/prompts/canvas/common.md?raw'
import commonRulesPrompt from '@/prompts/common/rules.md?raw'
import {
  isCodeElement,
  isEditorElement,
  isImageElement,
  isLinkElement,
  isVideoElement,
} from '@/state'
import type {CanvasLinkElement, ChatRole} from '@/types'
import type {CanvasService} from './CanvasService'
import type {ChatMessage} from './CopilotService'
import type {FileService} from './FileService'

export class CanvasThreadService {
  constructor(
    private canvasService: CanvasService,
    private fileService: FileService,
  ) {}

  getMessages(elementId: string): ChatMessage[] {
    const currentCanvas = this.canvasService.currentCanvas
    const messages: ChatMessage[] = []

    const addMessage = (role: ChatRole, content: string) => {
      messages.push({
        role,
        content: [{type: 'text', text: content}],
      })
    }

    if (!currentCanvas) return messages
    let curId: string | undefined = elementId

    while (curId) {
      const cur = currentCanvas.elements.find((el) => el.id === curId)
      const link = currentCanvas.elements.find((el) => isLinkElement(el) && el.to === curId) as
        | CanvasLinkElement
        | undefined

      curId = link?.from

      if (isEditorElement(cur)) {
        const file = this.fileService.findFileById(cur.id)
        addMessage('user', file?.editorView?.state.doc.textContent ?? '')
      } else if (isCodeElement(cur)) {
        const file = this.fileService.findFileById(cur.id)
        addMessage('user', file?.codeEditorView?.state.doc.toString() ?? '')
      } else if (isImageElement(cur)) {
        messages.push({
          role: 'user',
          content: [{type: 'image_url', image_url: {url: cur.src}}],
        })
      } else if (isVideoElement(cur)) {
        // not supported
      }
    }

    addMessage('system', commonCanvasRulesPrompt)
    addMessage('system', commonRulesPrompt)

    return messages.reverse()
  }
}
