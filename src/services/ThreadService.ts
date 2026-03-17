import {createDeepSignal} from '@solid-primitives/resource'
import {formatDate, isToday} from 'date-fns'
import {createResource, createSignal} from 'solid-js'
import {produce} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import {DB} from '@/db'
import codeBlockHandlingPrompt from '@/prompts/assistant-code-block-handling.md?raw'
import generateTitlePrompt from '@/prompts/generate-title.md?raw'
import summaryPrompt from '@/prompts/summary.md?raw'
import {debug, error, info} from '@/remote/log'
import {createTreeStore, type TreeItem} from '@/tree'
import {type Attachment, AttachmentType, type Message, type Thread} from '@/types'
import type {
  ChatMessage,
  ChatMessageImageContent,
  ChatMessageTextContent,
  Chunk,
  CopilotService,
} from './CopilotService'
import type {DialogService} from './DialogService'
import type {LocationService} from './LocationService'

export class ThreadService {
  public messageTree = createTreeStore<Message>()
  private attachmentsSignal = createSignal<Attachment[]>([])
  private threadsResource = createResource<Thread[]>(() => this.fetchThreads(), {
    storage: createDeepSignal, // store threads as proxy objects
  })

  static createId() {
    return uuidv4()
  }

  get attachments() {
    return this.attachmentsSignal[0]
  }

  get threads() {
    return this.threadsResource[0].latest
  }

  findThreadById(threadId: string): Thread | undefined {
    const [threads] = this.threadsResource
    return threads.latest?.find((t) => t.id === threadId)
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
    const [threads] = this.threadsResource
    const threadId = this.currentThreadId
    if (!threadId) return -1
    return threads.latest?.findIndex((t) => t.id === threadId) ?? -1
  }

  get lastMessage(): Message | undefined {
    return this.currentThread?.messages[this.currentThread.messages.length]
  }

  constructor(
    private copilotService: CopilotService,
    private locationService: LocationService,
    private dialogService: DialogService,
  ) {}

  async updateCurrentInput(text?: string) {
    const currentThread = this.currentThread
    if (!currentThread) return

    this.updateThread((thread) => {
      thread.currentInput = text
    })

    await this.saveThread()
  }

  async togglePrivate() {
    const currentThread = this.currentThread
    if (!currentThread || currentThread?.lastModified) return

    this.updateThread((thread) => {
      thread.private = !thread.private
    })

    await this.saveThread()
  }

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

  searchThreads(term?: string): [Thread, string | undefined][] {
    const [threads] = this.threadsResource
    // List of tuples with date label on beginning of a new group
    const pinned: [Thread, string | undefined][] = []
    const result: [Thread, string | undefined][] = []
    let currentYearMonth: string | undefined

    for (const thread of threads() ?? []) {
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
    info(`New thread`)
    const [threads] = this.threadsResource
    const thread = threads()?.find((it) => !it.lastModified)
    if (thread) {
      this.messageTree.updateAll([])
      return thread
    }

    const newThread = {
      id: ThreadService.createId(),
      messages: [],
    }

    info(`Create new thread (id=${newThread.id})`)
    const [, {mutate}] = this.threadsResource
    mutate((prev = []) => [...prev, newThread])

    this.messageTree.updateAll([])

    return newThread
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
      this.dialogService.toast({message: error?.message ?? error, action: 'Close'})
    }
  }

  async addMessage(message: Message) {
    const currentThread = this.currentThread
    if (!currentThread) return

    const parentId = message.parentId ?? this.getParentId()
    const newMessage = {...message, parentId}

    info(`Add new message (message=${JSON.stringify(newMessage)})`)
    this.updateThread((thread) => {
      thread.messages.push(newMessage)
      thread.lastModified = new Date()
      this.messageTree.add(thread.messages[thread.messages.length - 1])
    })

    await this.saveThread()
  }

  addChunk(id: string, parentId: string | undefined, chunk: string) {
    debug(`Stream message chunk (id=${id}, parentId=${parentId}, chunk=${chunk})`)

    const currentThread = this.currentThread
    if (!currentThread) return

    this.updateThread((thread) => {
      let messageIndex = thread.messages.findIndex((m) => m.id === id)

      if (messageIndex !== -1) {
        // Mutate proxy object in place
        thread.messages[messageIndex].content += chunk
      } else {
        info(`Create new message to stream to (id=${id}, parentId=${parentId})`)
        const modelId = this.copilotService.chatModel.id
        const newMessage = {
          id,
          content: chunk,
          role: 'assistant',
          parentId,
          modelId,
        } satisfies Message
        thread.messages.push(newMessage)
        messageIndex = thread.messages.length - 1

        // Add new message as proxy object to tree
        this.messageTree.add(thread.messages[messageIndex])
      }
    })
  }

  interrupt(id: string) {
    info(`Interrupt message streaming (id=${id})`)

    const currentThread = this.currentThread
    if (!currentThread) return

    this.updateThread((thread) => {
      const existing = thread.messages.find((m) => m.id === id)
      if (existing) existing.interrupted = true
    })
  }

  async updateTitle(threadId: string, title: string) {
    info(`Set title to thread (title=${title})`)

    const updatedThread = this.updateThread((thread) => {
      thread.title = title
    }, threadId)

    if (updatedThread) await this.saveThread(updatedThread)
  }

  async togglePin(threadId: string) {
    info(`Set pin to thread (id=${threadId})`)

    const updatedThread = this.updateThread((thread) => {
      thread.pinned = !thread.pinned
    }, threadId)

    if (updatedThread) await this.saveThread(updatedThread)
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
    const [, {mutate}] = this.threadsResource
    mutate((prev = []) => prev.filter((it) => it.id !== thread.id))
    await DB.deleteThread(thread.id)
  }

  async deleteAll(): Promise<Thread> {
    const [threads, {mutate}] = this.threadsResource
    for (const thread of threads.latest ?? []) {
      await DB.deleteThread(thread.id)
    }

    mutate([])
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
        modelId: this.copilotService.chatModel.id,
      }

      info(`Regenerate user message (message=${JSON.stringify(newMessage)})`)

      this.updateThread((thread) => {
        thread.messages.push(newMessage)
        thread.lastModified = new Date()
      })

      this.updatePath(message.parentId, newMessage.id)
      this.messageTree.add(currentThread.messages[currentThread.messages.length - 1])

      await this.saveThread()
    } else if (message.role === 'assistant') {
      this.updatePath(message.parentId, ThreadService.createId())
    }
  }

  updatePath(parentId: string | undefined, childId: string) {
    this.updateThread((thread) => {
      thread.path = new Map(thread.path).set(parentId, childId)
    })
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

        this.updateThread((thread) => {
          const target = thread.messages.find((m) => m.id === targetId)
          if (target) target.summary = summary
        })

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

  async fetchThreads() {
    return (await DB.getThreads())?.sort((a, b) => {
      return (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0)
    })
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

  private updateThread(
    fn: (thread: Thread) => void,
    threadId = this.currentThreadId,
  ): Thread | undefined {
    if (!threadId) return
    const [, {mutate}] = this.threadsResource
    let updatedThread: Thread | undefined
    mutate(
      produce((prev = []) => {
        updatedThread = prev.find((thread) => thread.id === threadId)
        if (updatedThread) fn(updatedThread)
      }),
    )

    return updatedThread
  }

  private async saveThread(thread = this.currentThread) {
    if (thread && !thread.private) {
      info(`Save thread (id=${thread?.id}, title=${thread?.title})`)
      await DB.updateThread(thread)
    }
  }
}
