import type {
  ChatMessage,
  ChatMessageImageContent,
  ChatMessageTextContent,
} from '@/services/CopilotService'
import {type Attachment, AttachmentType, type Message} from '@/types'

type ChatMessageContent = ChatMessageTextContent | ChatMessageImageContent
type AttrsWithContent = {content: string} & Record<string, string>

export class MessageUtil {
  static toChatMessage(message: Message): ChatMessage {
    const content: ChatMessageContent[] = []

    for (const attachment of message.attachments ?? []) {
      content.push(...MessageUtil.attachmentToContent(attachment))
    }

    if (message.content) {
      content.push({
        type: 'text',
        text: message.content,
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
      content.push({type: 'text', text: MessageUtil.labelTextStart('IMAGE ATTACHMENT')})
      content.push({type: 'image_url', image_url: {url: attachment.content}})
      content.push({type: 'text', text: MessageUtil.labelTextEnd('IMAGE ATTACHMENT')})
    } else if (attachment.type === AttachmentType.Text) {
      content.push(
        MessageUtil.labelText('TEXT/MARKDOWN ATTACHMENT', {
          type: 'Text or Markdown document',
          content: attachment.content,
        }),
      )
    } else if (attachment.type === AttachmentType.File) {
      content.push(
        MessageUtil.labelText('FILE ATTACHMENT', {
          type: attachment.codeLang ?? 'Plaintext',
          content: attachment.content,
        }),
      )
    } else if (attachment.type === AttachmentType.Selection) {
      content.push(
        MessageUtil.labelText('FILE ATTACHMENT', {
          type: attachment.codeLang ?? 'Plaintext',
          content: attachment.content,
        }),
      )
    } else if (attachment.type === AttachmentType.Project) {
      content.push({
        type: 'text',
        text: MessageUtil.labelTextStart('PROJECT ATTACHMENT', {
          projectName: attachment.projectName ?? 'Unknown',
          type: `Multi-file Project\nThe following contains multiple files or code/markdown items from a project:`,
        }),
      })

      attachment.content.forEach((it) => {
        if (it.type === AttachmentType.File || it.type === AttachmentType.Text) {
          content.push({
            type: 'text',
            text: `Project Item:\n${it.content}\n\n`,
          })
        }
      })
      content.push({type: 'text', text: MessageUtil.labelTextEnd('PROJECT ATTACHMENT')})
    }

    return content
  }

  private static labelText(label: string, attrs: AttrsWithContent): ChatMessageTextContent {
    return {
      type: 'text',
      text: MessageUtil.labelTextStart(label, attrs) + MessageUtil.labelTextEnd(label),
    }
  }

  private static labelTextStart(label: string, attrs: Record<string, string> = {}): string {
    const attrsText = Object.entries(attrs).reduce((acc, [k, v]) => `${acc}\n${k}: ${v}`, '')
    return `--- ${label} ---${attrsText}\n`
  }

  private static labelTextEnd(label: string) {
    return `--- END OF ${label} ---\n\n`
  }
}
