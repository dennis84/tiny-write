import type {FilePart, ModelMessage, TextPart, UserContent} from 'ai'
import fileAttachmentPrompt from '@/prompts/attachments/file.md?raw'
import projectAttachmentPrompt from '@/prompts/attachments/project.md?raw'
import userMessagePrompt from '@/prompts/common/user-message.md?raw'
import {
  type Attachment,
  AttachmentType,
  type FileAttachment,
  type Message,
  type SelectionAttachment,
  type TextAttachment,
  type Usage,
} from '@/types'

export class MessageUtil {
  static isEmptyUsage(usage?: Usage): boolean {
    if (!usage) return true
    if (usage.inputTokens == null || usage.outputTokens == null) return true
    return usage.inputTokens === 0 && usage.outputTokens === 0
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
      content: MessageUtil.toString(message),
    }
  }

  private static attachmentToContent(attachment: Attachment): (TextPart | FilePart)[] {
    const content: (TextPart | FilePart)[] = []
    if (attachment.type === AttachmentType.Image) {
      content.push({type: 'text', text: '--- IMAGE ATTACHMENT ---'})
      content.push({
        type: 'file',
        mediaType: attachment.mediaType,
        data: new URL(attachment.content),
      })
      content.push({type: 'text', text: '--- END OF IMAGE ATTACHMENT ---'})
    } else if (attachment.type === AttachmentType.Text) {
      content.push({
        type: 'text',
        text: MessageUtil.renderTemplate(fileAttachmentPrompt, {
          file_node: MessageUtil.fileNode(attachment),
        }),
      })
    } else if (attachment.type === AttachmentType.File) {
      content.push({
        type: 'text',
        text: MessageUtil.renderTemplate(fileAttachmentPrompt, {
          file_node: MessageUtil.fileNode(attachment),
        }),
      })
    } else if (attachment.type === AttachmentType.Selection) {
      content.push({
        type: 'text',
        text: MessageUtil.renderTemplate(fileAttachmentPrompt, {
          file_node: MessageUtil.fileNode(attachment),
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

  static fileNode(props: FileAttachment | SelectionAttachment | TextAttachment): string {
    const xmlDoc = new DOMParser().parseFromString('<file/>', 'application/xml')
    const root = xmlDoc.documentElement

    if (props.fileId) root.setAttribute('ref', props.fileId)
    if (props.path) root.setAttribute('path', props.path)

    const lang = props.type === AttachmentType.Text ? 'text/markdown' : props.codeLang
    if (lang) root.setAttribute('lang', lang)

    if (props.type === AttachmentType.Selection && props.selection) {
      root.setAttribute('range', `${props.selection[0]}-${props.selection[1]}`)
    }

    root.textContent = props.content

    return new XMLSerializer().serializeToString(xmlDoc)
  }

  static renderTemplate<T extends Record<string, any>>(template: string, data: T): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return key in data && data[key] != null ? String(data[key]) : match
    })
  }

  static toString(message: Message): string {
    return (
      message.content ??
      message.blocks
        ?.map((b) => {
          if (b.kind === 'text') return b.content ?? ''
          else if (b.kind === 'file') return MessageUtil.createCodeFence(b.content ?? '', b.lang)
          return ''
        })
        .join('\n\n') ??
      ''
    )
  }

  private static createCodeFence(code: string, lang?: string): string {
    let content = ''

    content += '```'
    content += lang ?? ''
    content += '\n'
    content += code
    content += '\n```'

    return content
  }
}
