import {formatDate, isToday} from 'date-fns'
import {createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import {DB} from '@/db'
import codeBlockHandlingPrompt from '@/prompts/assistant-code-block-handling.md?raw'
import generateTitlePrompt from '@/prompts/generate-title.md?raw'
import summaryPrompt from '@/prompts/summary.md?raw'
import {debug, error, info} from '@/remote/log'
import {createTreeStore, type TreeItem} from '@/tree'
import {type Attachment, AttachmentType, type Message, type State, type Thread} from '@/types'
import type {
  ChatMessage,
  ChatMessageImageContent,
  ChatMessageTextContent,
  Chunk,
  CopilotService,
} from './CopilotService'
import type {LocationService} from './LocationService'
import type {ToastService} from './ToastService'

export class ThreadService {
  public messageTree = createTreeStore<Message>()
  private attachmentsSignal = createSignal<Attachment[]>([])

  static createId() {
    return uuidv4()
  }

  get attachments() {
    return this.attachmentsSignal[0]
  }

  findThreadById(threadId: string): Thread | undefined {
    return this.store.threads.find((t) => t.id === threadId)
  }

  get currentThreadId(): string | undefined {
    return this.locationService.threadId
  }

  get currentThread(): Thread | undefined {
    const threadId = this.currentThreadId
    if (!threadId) return undefined
    return this.findThreadById(threadId)
  }

  get currentThreadIndex(): number {
    const threadId = this.currentThreadId
    if (!threadId) return -1
    return this.store.threads.findIndex((t) => t.id === threadId)
  }

  get lastMessage(): Message | undefined {
    return this.currentThread?.messages[this.currentThread.messages.length]
  }

  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
    private copilotService: CopilotService,
    private locationService: LocationService,
    private toastService: ToastService,
  ) {}

  setAttachments(attachments: Attachment[]) {
    this.attachmentsSignal[1](attachments)
  }

  addAttachment(attachment: Attachment) {
    this.attachmentsSignal[1]((prev) => {
      // Remove any existing attachment with the same fileId or name
      const filtered = prev.filter((existing) => {
        const isSameFile = attachment.fileId && existing.fileId === attachment.fileId
        const isSameName = attachment.name && existing.name === attachment.name
        return !(isSameFile || isSameName)
      })

      return [...filtered, attachment]
    })
  }

  removeAttachment(attachment: Attachment) {
    this.attachmentsSignal[1]((prev) => prev.filter((a) => a !== attachment))
  }

  getThreads(term?: string): [Thread, string | undefined][] {
    // List of tuples with date label on beginning of a new group
    const pinned: [Thread, string | undefined][] = []
    const result: [Thread, string | undefined][] = []
    let currentYearMonth: string | undefined

    for (const thread of this.store.threads) {
      if (!thread.lastModified) continue

      if (term && thread.title) {
        const searchTerm = term.toLowerCase()
        const title = thread.title.toLowerCase()
        if (!title.includes(searchTerm)) continue
      }

      if (thread.pinned) {
        if (pinned.length === 0) pinned.push([thread, 'Pinned'])
        else pinned.push([thread, undefined])
      } else if (isToday(thread.lastModified)) {
        if (!result.length) result.push([thread, 'Today'])
        else result.push([thread, undefined])
      } else {
        const yearMonth = formatDate(thread.lastModified, 'yyyy-MM')
        if (currentYearMonth !== yearMonth) {
          result.push([thread, formatDate(thread.lastModified, 'MMMM')])
          currentYearMonth = yearMonth
        } else {
          result.push([thread, undefined])
        }
      }
    }

    return [...pinned, ...result]
  }

  newThread(): Thread {
    const thread: Thread = {
      id: ThreadService.createId(),
      messages: [],
    }

    info(`Create new thread (id=${thread.id})`)

    const threads = this.store.threads.filter((t) => t.title)

    threads.unshift(thread)
    this.setState('threads', threads)
    this.messageTree.updateAll([])

    return thread
  }

  async sendMessages() {
    const currentThread = this.currentThread

    const {messages, nextId, parentId} = this.getMessages()
    if (!currentThread || !messages) return

    const messageId = nextId ?? uuidv4()

    // Create answer message directly to visualize loading
    this.addChunk(messageId, parentId, '')

    try {
      const result = await this.copilotService.completions(messages, (chunk: Chunk) => {
        for (const choice of chunk.choices) {
          const chunk = choice.delta?.content ?? choice.message?.content ?? ''
          this.addChunk(messageId, parentId, chunk)
        }
      })

      if (result.success) {
        await this.saveThread()
        if (!currentThread.title) {
          try {
            const title = await this.generateTitle()
            if (title) await this.updateTitle(currentThread.id, title)
          } catch {
            // ignore
          }
        }

        await this.summarize()
      } else if (result.interrupted) {
        this.interrupt(messageId)
      }
    } catch (error: any) {
      this.toastService.open({message: error?.message ?? error, action: 'Close'})
    }
  }

  async addMessage(message: Message) {
    const currentThread = this.currentThread
    if (!currentThread) return

    const parentId = message.parentId ?? this.getParentId()
    const newMessage = {...message, parentId}

    info(`Add new message (message=${JSON.stringify(newMessage)})`)
    this.setState('threads', this.currentThreadIndex, {
      messages: [...currentThread.messages, newMessage],
      lastModified: new Date(),
    })

    this.messageTree.add(newMessage)

    await this.saveThread()
  }

  addChunk(id: string, parentId: string | undefined, chunk: string) {
    debug(`Stream message chunk (id=${id}, parentId=${parentId}, chunk=${chunk})`)

    const currentThread = this.currentThread
    if (!currentThread) return

    const currentThreadIndex = this.currentThreadIndex

    let messageIndex = currentThread.messages.findIndex((m) => m.id === id)
    if (messageIndex === -1) {
      info(`Create new message to stream to (id=${id}, parentId=${parentId})`)
      const newMessage: Message = {id, content: '', role: 'assistant', parentId} as Message
      this.setState('threads', currentThreadIndex, 'messages', (prev) => [...prev, newMessage])
      messageIndex = currentThread.messages.length - 1
    }

    this.setState(
      'threads',
      currentThreadIndex,
      'messages',
      messageIndex,
      'content',
      (prev) => prev + chunk,
    )

    const message = this.store.threads[currentThreadIndex].messages[messageIndex]
    this.messageTree.updateValue(message)
  }

  interrupt(id: string) {
    info(`Interrupt message streaming (id=${id})`)

    const currentThread = this.currentThread
    if (!currentThread) return

    const currentThreadIndex = this.currentThreadIndex

    const messageIndex = currentThread.messages.findIndex((m) => m.id === id)

    this.setState('threads', currentThreadIndex, 'messages', messageIndex, 'interrupted', true)

    const message = this.store.threads[currentThreadIndex].messages[messageIndex]
    this.messageTree.updateValue(message)
  }

  async removeMessage(message: Message) {
    const currentThread = this.currentThread
    if (!currentThread) return
    info(`Remove message from thread (message=${JSON.stringify(message)})`)
    const index = currentThread.messages.indexOf(message)
    const messages = currentThread.messages.filter((_, i) => i !== index)
    this.setState('threads', this.currentThreadIndex, (prev) => ({
      ...prev,
      messages,
      lastModified: new Date(),
    }))

    this.messageTree.remove(message.id)

    await this.saveThread()
  }

  async updateTitle(threadId: string, title: string) {
    const index = this.store.threads.findIndex((t) => t.id === threadId)
    if (index === -1) return

    info(`Set title to thread (title=${title})`)
    this.setState('threads', index, 'title', title)
    await this.saveThread(this.store.threads[index])
  }

  async togglePin(threadId: string) {
    const index = this.store.threads.findIndex((t) => t.id === threadId)
    if (index === -1) return

    const old = this.store.threads[index].pinned ?? false
    info(`Set pin to thread (id=${threadId}, pinned=${!old})`)
    this.setState('threads', index, 'pinned', !old)
    await this.saveThread(this.store.threads[index])
  }

  async saveThread(thread = this.currentThread) {
    info(`Save thread (id=${thread?.id}, title=${thread?.title})`)
    if (thread?.title) {
      await DB.updateThread(thread)
    }
  }

  init() {
    info(`Initialize thread`)

    const currentThread = this.currentThread
    if (!currentThread) {
      throw new Error(`Thread not found (id=${this.currentThreadId})`)
    }

    this.messageTree.updateAll(currentThread?.messages ?? [])
  }

  async delete(thread: Thread) {
    this.setState(
      'threads',
      this.store.threads.filter((t) => t.id !== thread.id),
    )
    await DB.deleteThread(thread.id)
  }

  async deleteAll(): Promise<Thread> {
    for (const thread of this.store.threads) {
      await DB.deleteThread(thread.id)
    }

    this.setState('threads', [])
    return this.newThread()
  }

  async regenerate(message: Message) {
    const currentThread = this.currentThread
    if (!currentThread) return

    if (message.role === 'user') {
      const newMessage = {
        ...message,
        id: ThreadService.createId(),
        leftId: message.id,
      }

      info(`Regenerate user message (message=${JSON.stringify(newMessage)})`)
      const messages = [...currentThread.messages, newMessage]

      this.setState('threads', this.currentThreadIndex, {
        messages,
        lastModified: new Date(),
      })

      this.updatePath(message.parentId, newMessage.id)
      this.messageTree.add(newMessage)

      await this.saveThread()
    } else if (message.role === 'assistant') {
      this.updatePath(message.parentId, ThreadService.createId())
    }
  }

  updatePath(parentId: string | undefined, childId: string) {
    this.setState('threads', this.currentThreadIndex, 'path', (prev) =>
      new Map(prev).set(parentId, childId),
    )
  }

  getNextItem(parentId: string | undefined, childrenIds: string[]): TreeItem<Message> | undefined {
    const currentThread = this.currentThread
    if (!currentThread) return

    const overridePath = currentThread.path?.get(parentId)
    const nextId = overridePath ?? childrenIds[childrenIds.length - 1]

    if (nextId) return this.messageTree.getItem(nextId)
  }

  async summarize() {
    const currentThread = this.currentThread
    if (!currentThread) return

    let messages: ChatMessage[] = []
    let targetId: string | undefined

    this.traverseTree((it) => {
      if (it.value.summary) messages = []
      messages.push(this.toChatMessage(it.value))
      targetId = it.value.id
    })

    const {promptCount, outputCount} = this.tokenCount(messages)
    info(`Maybe create summary (promptCount=${promptCount}, outputCount=${outputCount})`)

    const currentModel = this.copilotService.chatModel
    const promptLimit = currentModel.maxPromptTokens * 0.7
    const outputLimit = currentModel.maxOutputTokens * 0.7
    if (promptCount < promptLimit && outputCount < outputLimit) {
      return
    }

    messages.push({role: 'system', content: [{type: 'text', text: summaryPrompt}]})

    try {
      const summary = await this.copilotService.completionsSync(messages)
      if (summary) {
        info(
          `Add summary to message (messageId=${targetId}, promptLimit=${promptLimit}, outputLimit=${outputLimit})`,
        )
        const currentThreadIndex = this.currentThreadIndex
        const messageIndex = currentThread.messages.findIndex((m) => m.id === targetId)

        this.setState('threads', currentThreadIndex, 'messages', messageIndex, 'summary', summary)

        const message = this.store.threads[currentThreadIndex].messages[messageIndex]
        this.messageTree.updateValue(message)

        await this.saveThread()
      }
    } catch {
      error('Summarization failed')
    }
  }

  async generateTitle(): Promise<string | undefined> {
    info(`Generate title for current thread`)
    const currentThread = this.currentThread
    if (!currentThread) return

    const question: ChatMessage = {
      role: 'user',
      content: [{type: 'text', text: generateTitlePrompt}],
    }

    const messages: ChatMessage[] = currentThread.messages.map((m) => this.toChatMessage(m))
    messages.push(question)

    const title = this.copilotService.completionsSync(messages)
    if (!title) throw new Error('Cannot guess a title for current thread.')

    return title
  }

  traverseTree(fn: (it: TreeItem<Message>) => void) {
    const currentThread = this.currentThread
    if (!currentThread) return undefined

    const path = currentThread.path
    let nextId =
      path?.get(undefined) ?? this.messageTree.rootItemIds[this.messageTree.rootItemIds.length - 1]
    let next: TreeItem<Message> | undefined
    let parentId: string | undefined

    while ((next = this.messageTree.getItem(nextId))) {
      fn(next)
      nextId = path?.get(next.id) ?? next.childrenIds[next.childrenIds.length - 1]
    }

    return parentId
  }

  getParentId(): string | undefined {
    let parentId: string | undefined
    this.traverseTree((it) => {
      parentId = it.value.id
    })

    return parentId
  }

  getMessages(): {messages: ChatMessage[]; nextId?: string; parentId?: string} {
    const currentThread = this.currentThread
    if (!currentThread) return {messages: []}

    let messages: ChatMessage[] = []
    let parentId: string | undefined
    let nextId: string | undefined
    let hasCodeBlock = false
    let lastSummaryIndex = -1
    let lastSummary: string | undefined

    this.traverseTree((it) => {
      nextId = currentThread.path?.get(it.id)
      const message = this.toChatMessage(it.value)

      // remember if any code block exists
      if (!hasCodeBlock && this.hasCodeBlock(message)) {
        hasCodeBlock = true
      }

      // remember last summary
      if (it.value.summary) {
        lastSummaryIndex = messages.length
        lastSummary = it.value.summary
      }

      messages.push(message)

      const {promptCount, outputCount} = this.tokenCount(messages)
      const currentModel = this.copilotService.chatModel
      const promptLimit = currentModel.maxPromptTokens * 0.9
      const outputLimit = currentModel.maxOutputTokens * 0.9

      // Reduce messages starting from last summary
      if (lastSummaryIndex !== -1 && (promptCount > promptLimit || outputCount > outputLimit)) {
        messages = [
          {role: 'system', content: [{type: 'text', text: lastSummary ?? ''}]},
          ...messages.slice(lastSummaryIndex + 1),
        ]
      }

      parentId = it.value.id
    })

    if (hasCodeBlock) {
      const message: ChatMessage = {
        role: 'system',
        content: [{type: 'text', text: codeBlockHandlingPrompt}],
      }
      messages.unshift(message)
    }

    return {
      nextId,
      parentId,
      messages,
    }
  }

  hasItem(id: string): boolean {
    return this.messageTree.getItem(id) !== undefined
  }

  private toChatMessage(message: Message): ChatMessage {
    const content: (ChatMessageTextContent | ChatMessageImageContent)[] = []

    for (const attachment of message.attachments ?? []) {
      if (attachment.type === AttachmentType.Image) {
        content.push({
          type: 'image_url',
          image_url: {url: attachment.content},
        })
      } else {
        content.push({
          type: 'text',
          text: attachment.content,
        })
      }
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

  private hasCodeBlock(message: ChatMessage): boolean {
    for (const c of message.content) {
      if (c.type === 'text' && c.text.includes('```')) return true
    }

    return false
  }

  private tokenCount(messages: ChatMessage[]): {promptCount: number; outputCount: number} {
    let outputCount = 0
    let promptCount = 0

    for (const message of messages) {
      for (const content of message.content) {
        if (content.type === 'text') {
          const words = content.text.split(/\s+/).length
          const chars = content.text.length
          const punctuation = (content.text.match(/[^a-zA-Z0-9\s]/g) || []).length
          const count = Math.ceil(words * 1.3 + punctuation * 0.5 + chars / 15)
          if (message.role === 'assistant') {
            outputCount += count
          } else {
            promptCount += count
          }
        }
      }
    }

    return {promptCount, outputCount}
  }
}
