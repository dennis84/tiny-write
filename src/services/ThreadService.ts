import {formatDate, isToday} from 'date-fns'
import {createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import {DB} from '@/db'
import codeBlockHandlingPrompt from '@/prompts/assistant-code-block-handling.md?raw'
import {info} from '@/remote/log'
import {type Attachment, AttachmentType, type Message, type State, type Thread} from '@/state'
import {createTreeStore, type TreeItem} from '@/tree'
import type {
  ChatMessage,
  ChatMessageImageContent,
  ChatMessageTextContent,
  CopilotService,
} from './CopilotService'

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
    return this.store.location?.threadId
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
    const result: [Thread, string | undefined][] = []
    let currentYearMonth: string | undefined

    for (const thread of this.store.threads) {
      if (!thread.lastModified) continue

      if (term && thread.title) {
        const searchTerm = term.toLowerCase()
        const title = thread.title.toLowerCase()
        if (!title.includes(searchTerm)) continue
      }

      if (isToday(thread.lastModified)) {
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

    return result
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

  streamLastMessage(id: string, parentId: string | undefined, chunk: string) {
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

    this.setState('threads', currentThreadIndex, 'messages', messageIndex, (prev) => ({
      content: prev.content + chunk,
    }))

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

  setError(error: string) {
    const currentThread = this.currentThread
    if (!currentThread) return

    const currentThreadIndex = this.currentThreadIndex
    const messageIndex = currentThread.messages.length - 1

    info(`Set error to last message (error=${error})`)
    this.setState('threads', currentThreadIndex, 'messages', messageIndex, 'error', error)

    const message = this.store.threads[currentThreadIndex].messages[messageIndex]
    this.messageTree.updateValue(message)
  }

  async updateTitle(title: string, currentThread = this.currentThread) {
    if (!currentThread) return
    const index = this.store.threads.indexOf(currentThread)
    info(`Set title to current thread (title=${title})`)
    this.setState('threads', index, 'title', title)
    await this.saveThread()
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

  async generateTitle(): Promise<string | undefined> {
    info(`Generate title for current thread`)
    const currentThread = this.currentThread
    if (!currentThread) return

    return new Promise((resolve, reject) => {
      const question: ChatMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Generate a concise title of 3-7 words for this conversation and leave out the punctuation. Return the title directly, without preamble and prefix.',
          },
        ],
      }

      let title = ''
      const messages: ChatMessage[] = currentThread.messages.map((m) => this.toChatMessage(m))
      messages.push(question)

      return this.copilotService.completions(
        messages,
        (chunk) => {
          for (const choice of chunk.choices) {
            const content = choice.delta?.content ?? choice.message?.content ?? ''
            title += content
          }
        },
        () => {
          if (title) resolve(title)
          else reject('Cannot guess a title for current thread.')
        },
        false,
      )
    })
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
      if (!it.value.error) parentId = it.value.id
    })

    return parentId
  }

  getMessages(): {messages: ChatMessage[]; nextId?: string; parentId?: string} {
    const currentThread = this.currentThread
    if (!currentThread) return {messages: []}

    const messages: ChatMessage[] = []
    let parentId: string | undefined
    let nextId: string | undefined

    this.traverseTree((it) => {
      nextId = currentThread.path?.get(it.id)

      if (!it.value.error) {
        messages.push(this.toChatMessage(it.value))
        parentId = it.value.id
      }
    })

    // final must be role user
    if (messages[messages.length - 1]?.role !== 'user') {
      return {messages: []}
    }

    if (messages.find((m) => this.hasCodeBlock(m))) {
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
}
