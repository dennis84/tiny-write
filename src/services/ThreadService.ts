import {createSignal} from 'solid-js'
import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import {Message, MessageType, State, Thread} from '@/state'
import {DB} from '@/db'
import {info} from '@/remote/log'
import {createTreeStore, TreeItem} from '@/tree'
import {ChatMessage, CopilotService} from './CopilotService'
import {FileService} from './FileService'
import {createCodeFence} from '@/components/assistant/util'

type PathMap = Map<string | undefined, string>

export class ThreadService {
  public messageTree = createTreeStore<Message>()
  private pathMapSignal = createSignal<PathMap>(new Map())

  static createId() {
    return uuidv4()
  }

  get pathMap() {
    return this.pathMapSignal[0]
  }

  get currentThreadId(): string | undefined {
    return this.store.lastLocation?.threadId
  }

  get currentThread(): Thread | undefined {
    const threadId = this.currentThreadId
    if (!threadId) return
    return this.store.threads.find((t) => t.id === threadId)
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
    private fileService: FileService,
  ) {}

  newThread(): Thread {
    const thread: Thread = {
      id: ThreadService.createId(),
      messages: [],
    }

    info(`Create new thread (id=${thread.id})`)

    const threads = this.store.threads.filter((t) => t.title)

    threads.unshift(thread)
    this.setState('threads', threads)
    this.pathMapSignal[1](new Map())
    this.messageTree.updateAll([])

    return thread
  }

  async addMessage(message: Message) {
    const currentThread = this.currentThread
    if (!currentThread) return

    const parentId =
      message.parentId ?? currentThread.messages[currentThread.messages.length - 1]?.id
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
      streaming: true,
    }))

    const message = this.store.threads[currentThreadIndex].messages[messageIndex]
    this.messageTree.updateValue(message)
  }

  streamLastMessageEnd(id: string) {
    const currentThread = this.currentThread
    if (!currentThread) return

    const currentThreadIndex = this.currentThreadIndex
    const messageIndex = currentThread.messages.findIndex((m) => m.id === id)

    this.setState('threads', currentThreadIndex, 'messages', messageIndex, 'streaming', false)

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

  async updateTitle(title: string) {
    const currentThread = this.currentThread
    if (!currentThread) return
    info(`Set title to current thread (title=${title})`)
    this.setState('threads', this.currentThreadIndex, 'title', title)
    await this.saveThread()
  }

  async saveThread(thread = this.currentThread) {
    info(`Save thread (id=${thread?.id}, title=${thread?.title})`)
    if (thread?.title) {
      await DB.updateThread(unwrap(thread))
    }
  }

  open(threadId: string) {
    info(`Open thread (id=${threadId})`)
    const threads = this.store.threads.filter((t) => t.title !== undefined)
    this.setState('threads', threads)
    this.pathMapSignal[1](new Map())
    this.messageTree.updateAll(this.currentThread?.messages ?? [])
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
    this.pathMapSignal[1]((prev) => new Map(prev).set(parentId, childId))
  }

  getItem(parentId: string | undefined, childrenIds: string[]): TreeItem<Message> | undefined {
    const overridePath = this.pathMap().get(parentId)
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
        content:
          'Generate a concise title of 3-7 words for this conversation and leave out the punctuation. Return the title directly, without preamble and prefix.',
      }

      let title = ''
      const messages = currentThread.messages.map((m) => ({role: m.role, content: m.content}))
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

  getMessages(): {messages: ChatMessage[]; nextId?: string; parentId?: string} {
    const currentThread = this.currentThread
    if (!currentThread) return {messages: []}

    const messages = []
    const pathMap = this.pathMap()
    let nextId =
      pathMap.get(undefined) ??
      this.messageTree.rootItemIds[this.messageTree.rootItemIds.length - 1]
    let next
    let parentId

    while ((next = this.messageTree.getItem(nextId))) {
      if (!next.value.error) {
        messages.push({role: next.value.role, content: next.value.content})
        parentId = next.value.id
      }

      nextId = pathMap.get(next.id) ?? next.childrenIds[next.childrenIds.length - 1]
    }

    // final must be role user
    if (messages[messages.length - 1]?.role !== 'user') {
      return {messages: []}
    }

    if (messages.find((m) => m.content.includes('```'))) {
      const instruction1 =
        'If attributes are included in fenced code blocks in the user message, keep the attributes exactly as they are. INPUT: ```rust id=1 range=1-5 file=filename.rs ... OUTPUT: ```rust id=1 range=1-5 file=filename.rs'
      const instruction2 = 'Keep the indentation in code blocks as in the user message.'
      const instruction3 =
        'If the user message contains a fenced code block and the attributes does not contain a file or id, try to guess a filename and add to the fenced code block: INPUT: ```ts ... OUTPUT: ```ts file=components/App.tsx'
      const content = `${instruction1} ${instruction2} ${instruction3}`
      const message: ChatMessage = {role: 'system', content}
      messages.unshift(message)
    }

    return {
      nextId,
      parentId,
      messages,
    }
  }

  async insertAutoContext() {
    const currentFile = this.fileService.currentFile
    const editorView = currentFile?.codeEditorView

    const currentThread = this.currentThread

    if (!editorView || !currentThread) return

    const messages: Message[] = []
    const pathMap = this.pathMap()
    let nextId =
      pathMap.get(undefined) ??
      this.messageTree.rootItemIds[this.messageTree.rootItemIds.length - 1]
    let next

    while ((next = this.messageTree.getItem(nextId))) {
      messages.push(next.value)
      nextId = pathMap.get(next.id) ?? next.childrenIds[next.childrenIds.length - 1]
    }

    const existing = messages.find((m) => m.fileId === currentFile.id)
    const content = createCodeFence({
      code: editorView.state.doc.toString(),
      id: currentFile.id,
      lang: currentFile.codeLang,
      path: currentFile.path,
    })

    if (existing?.content === content) {
      // Skip is same content already in thread
      return
    }

    const before = messages[messages.length - 1]

    const message: Message = {
      id: ThreadService.createId(),
      role: 'user',
      fileId: currentFile.id,
      type: MessageType.File,
      content,
      parentId: before.id,
    }

    info(`Auto add context message (message=${JSON.stringify(message)})`)

    const updates: string[] = []
    updates.push(...this.messageTree.add(message))

    const updatedMessages = currentThread.messages.map((message) => {
      if (updates.includes(message.id)) {
        const item = this.messageTree.getItem(message.id)
        return {
          ...message,
          parentId: item?.parentId,
          leftId: item?.leftId,
        }
      } else {
        return message
      }
    })

    updatedMessages.push(message)

    this.setState('threads', this.currentThreadIndex, (prev) => ({
      ...prev,
      messages: updatedMessages,
      lastModified: new Date(),
    }))

    await this.saveThread()
  }
}
