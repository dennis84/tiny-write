import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import {Message, State, Thread} from '@/state'
import {DB} from '@/db'
import {info} from '@/remote/log'
import {createTreeStore, TreeItem} from '@/tree'
import {ChatMessage, CopilotService} from './CopilotService'
import {createSignal} from 'solid-js'

type PathMap = Map<string | undefined, string>

export class ThreadService {
  public messageTree = createTreeStore<Message>()
  private pathMapSignal = createSignal<PathMap>(new Map())

  get pathMap() {
    return this.pathMapSignal[0]
  }

  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
    private copilotService: CopilotService,
  ) {}

  get currentThread(): Thread | undefined {
    return this.store.threads.find((t) => t.active)
  }

  get currentThreadIndex(): number {
    return this.store.threads.findIndex((t) => t.active)
  }

  get lastMessage(): Message | undefined {
    return this.currentThread?.messages[this.currentThread.messages.length]
  }

  newThread() {
    const thread: Thread = {
      id: uuidv4(),
      messages: [],
      active: true,
    }

    info(`Create new thread (id=${thread.id})`)

    const threads = []
    for (let i = 0; i < this.store.threads.length; i++) {
      const cur = this.store.threads[i]
      if (cur.title) {
        threads.push({...cur, active: false})
      }
    }

    threads.unshift(thread)
    this.setState('threads', threads)
    this.pathMapSignal[1](new Map())
    this.messageTree.updateAll([])
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

  // async updateMessage(message: Message) {
  //   const currentThread = this.currentThread
  //   if (!currentThread) return
  //
  //   info(`Update message (message=${JSON.stringify(message)})`)
  //
  //   const currentThreadIndex = this.currentThreadIndex
  //
  //   const existingIndex = currentThread.messages.findIndex((m) => m.id === message.id)
  //   if (existingIndex !== -1) {
  //     this.setState('threads', currentThreadIndex, 'messages', existingIndex, message)
  //     this.setState('threads', currentThreadIndex, 'lastModified', new Date())
  //   }
  //
  //   await this.saveThread()
  // }

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

  async clear() {
    const currentThread = this.currentThread
    if (!currentThread) return
    info(`Clear current thread (id=${currentThread.id})`)
    this.setState('threads', this.currentThreadIndex, (prev) => ({
      ...prev,
      messages: [],
      lastModified: new Date(),
    }))

    this.pathMapSignal[1](new Map())
    this.messageTree.updateAll([])

    await DB.deleteThread(currentThread.id)
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
    const threads = []
    for (let i = 0; i < this.store.threads.length; i++) {
      const cur = this.store.threads[i]
      if (cur.id === threadId) {
        threads.push({...cur, active: true})
      } else if (cur.title) {
        threads.push({...cur, active: false})
      }
    }

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

  async deleteAll() {
    for (const thread of this.store.threads) {
      await DB.deleteThread(thread.id)
    }

    this.setState('threads', [])
    this.newThread()
  }

  async regenerate(message: Message) {
    const currentThread = this.currentThread
    if (!currentThread) return

    if (message.role === 'user') {
      const newMessage = {
        ...message,
        id: uuidv4(),
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
      this.updatePath(message.parentId, uuidv4())
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
          "Generate a concise 3-7 word title for this conversation, omitting punctuation. Go straight to the title, without any preamble and prefix like `Here's a concise suggestion:...` or `Title:`",
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

    return {
      nextId,
      parentId,
      messages: [
        {
          role: 'system',
          content:
            'Keep attributes on fenced code blocks if present: e.g. ```rust id=1 range=1-5. Keep indentation in code blocks',
        },
        ...messages,
      ],
    }
  }
}
