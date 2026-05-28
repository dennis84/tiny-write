import userMessagePrompt from '@/prompts/assistant/user-message.md?raw'
import fileAttachmentPrompt from '@/prompts/attachments/file.md?raw'
import projectAttachmentPrompt from '@/prompts/attachments/project.md?raw'
import textAttachmentPrompt from '@/prompts/attachments/text.md?raw'
import type {
  ChatMessage,
  ChatMessageImageContent,
  ChatMessageTextContent,
} from '@/services/CopilotService'
import {type Attachment, AttachmentType, type Message} from '@/types'

type ChatMessageContent = ChatMessageTextContent | ChatMessageImageContent

export class MessageUtil {
  static toChatMessage(message: Message, latest = false): ChatMessage {
    const content: ChatMessageContent[] = []

    for (const attachment of message.attachments ?? []) {
      content.push(...MessageUtil.attachmentToContent(attachment))
    }

    if (message.content) {
      const text = latest
        ? MessageUtil.renderTemplate(userMessagePrompt, {message: message.content})
        : message.content

      content.push({
        type: 'text',
        text,
      })
    }

    return {
      role: message.role,
      content,
    }
  }

  private static attachmentToContent(attachment: Attachment): ChatMessageContent[] {
    const content: ChatMessageContent[] = []
    if (attachment.type === AttachmentType.Image) {
      content.push({type: 'text', text: '--- IMAGE ATTACHMENT ---'})
      content.push({type: 'image_url', image_url: {url: attachment.content}})
      content.push({type: 'text', text: '--- END OF IMAGE ATTACHMENT ---'})
    } else if (attachment.type === AttachmentType.Text) {
      content.push({
        type: 'text',
        text: MessageUtil.renderTemplate(textAttachmentPrompt, {
          content: attachment.content,
        }),
      })
    } else if (attachment.type === AttachmentType.File) {
      content.push({
        type: 'text',
        text: MessageUtil.renderTemplate(fileAttachmentPrompt, {
          type: attachment.codeLang ?? 'Plaintext',
          content: attachment.content,
        }),
      })
    } else if (attachment.type === AttachmentType.Selection) {
      content.push({
        type: 'text',
        text: MessageUtil.renderTemplate(fileAttachmentPrompt, {
          type: attachment.codeLang ?? 'Plaintext',
          content: attachment.content,
        }),
      })
    } else if (attachment.type === AttachmentType.Project) {
      content.push({
        type: 'text',
        text: MessageUtil.renderTemplate(projectAttachmentPrompt, {
          tree: attachment.tree,
          files: attachment.files
            .map((it) => {
              if (it.type === AttachmentType.File || it.type === AttachmentType.Text) {
                return `Opened file:\n${it.content}\n`
              } else {
                return ''
              }
            })
            .join('\n'),
        }),
      })
    }

    return content
  }

  static renderTemplate<T extends Record<string, any>>(template: string, data: T): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return key in data && data[key] != null ? String(data[key]) : match
    })
  }
}
