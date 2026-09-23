import type {FilePart, ModelMessage, TextPart, UserContent} from 'ai'
import fileAttachmentPrompt from '@/prompts/attachments/file.md?raw'
import projectAttachmentPrompt from '@/prompts/attachments/project.md?raw'
import textAttachmentPrompt from '@/prompts/attachments/text.md?raw'
import userMessagePrompt from '@/prompts/common/user-message.md?raw'
import {type Attachment, AttachmentType, type Message} from '@/types'

export class MessageUtil {
  static tokenCount(messages: ModelMessage[]): {promptCount: number; outputCount: number} {
    let outputCount = 0
    let promptCount = 0

    const countText = (text: string) => {
      const words = text.split(/\s+/).length
      const chars = text.length
      const punctuation = (text.match(/[^a-zA-Z0-9\s]/g) || []).length
      return Math.ceil(words * 1.3 + punctuation * 0.5 + chars / 15)
    }

    for (const message of messages) {
      if (message.role === 'user') {
        if (typeof message.content === 'string') {
          outputCount += countText(message.content)
        } else if (Array.isArray(message.content)) {
          message.content.forEach((c) => {
            if (c.type === 'text') outputCount += countText(c.text)
          })
        }
      } else if (message.role === 'assistant') {
        if (typeof message.content === 'string') {
          promptCount += countText(message.content)
        } else if (Array.isArray(message.content)) {
          message.content.forEach((c) => {
            if (c.type === 'text') promptCount += countText(c.text)
          })
        }
      } else if (message.role === 'system') {
        outputCount += countText(message.content)
      } else if (message.role === 'tool') {
        // not yet
      }
    }

    return {promptCount, outputCount}
  }

  static toModelMessage(message: Message, latest = false): ModelMessage {
    if (message.role === 'user') {
      const content: UserContent = []

      for (const attachment of message.attachments ?? []) {
        content.push(...MessageUtil.attachmentToContent(attachment))
      }

      if (message.content) {
        const text = latest
          ? MessageUtil.renderTemplate(userMessagePrompt, {message: message.content})
          : message.content
        content.push({type: 'text', text})
      }

      return {
        role: message.role,
        content: content ?? '',
      }
    }

    return {
      role: message.role,
      content: message.content,
    }
  }

  private static attachmentToContent(attachment: Attachment): (TextPart | FilePart)[] {
    const content: (TextPart | FilePart)[] = []
    if (attachment.type === AttachmentType.Image) {
      content.push({type: 'text', text: '--- IMAGE ATTACHMENT ---'})
      content.push({
        type: 'file',
        mediaType: attachment.mediaType,
        data: new URL(attachment.content), //{type: 'data', data: attachment.content},
      })
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
