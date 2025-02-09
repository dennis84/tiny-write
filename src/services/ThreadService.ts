import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import {Message, State, Thread} from '@/state'
import {DB} from '@/db'
import {info} from '@/remote/log'
import {ChatMessage, CopilotService} from './CopilotService'

export class ThreadService {
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
  }

  async addMessage(message: Message) {
    const currentThread = this.currentThread
    if (!currentThread) return

    info(`Add new message (message=${JSON.stringify(message)})`)
    this.setState('threads', this.currentThreadIndex, {
      messages: [...currentThread.messages, message],
      lastModified: new Date(),
    })

    this.saveThread()
  }

  streamLastMessage(id: string, chunk: string) {
    const currentThread = this.currentThread
    if (!currentThread) return

    let messageIndex = currentThread.messages.findIndex((m) => m.id === id)
    if (messageIndex === -1) {
      const newMessage: Message = {id, content: '', role: 'assistant'} as Message
      this.setState('threads', this.currentThreadIndex, 'messages', (prev) => [...prev, newMessage])
      messageIndex = currentThread.messages.length - 1
    }

    this.setState('threads', this.currentThreadIndex, 'messages', messageIndex, (prev) => ({
      content: prev.content + chunk,
      streaming: true,
    }))
  }

  streamLastMessageEnd(id: string) {
    const currentThread = this.currentThread
    if (!currentThread) return
    let messageIndex = currentThread.messages.findIndex((m) => m.id === id)
    this.setState('threads', this.currentThreadIndex, 'messages', messageIndex, 'streaming', false)
  }

  async updateMessage(message: Message) {
    const currentThread = this.currentThread
    if (!currentThread) return

    info(`Update message (message=${JSON.stringify(message)})`)

    const existingIndex = currentThread.messages.findIndex((m) => m.id === message.id)
    if (existingIndex !== -1) {
      this.setState('threads', this.currentThreadIndex, 'messages', existingIndex, message)
      this.setState('threads', this.currentThreadIndex, 'lastModified', new Date())
    }

    this.saveThread()
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

    this.saveThread()
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

    await DB.deleteThread(currentThread.id)
  }

  setError(error: string) {
    const currentThread = this.currentThread
    if (!currentThread) return
    info(`Set error to last message (error=${error})`)
    this.setState(
      'threads',
      this.currentThreadIndex,
      'messages',
      currentThread.messages.length - 1,
      'error',
      error,
    )
  }

  async updateTitle(title: string) {
    const currentThread = this.currentThread
    if (!currentThread) return
    info(`Set title to current thread (title=${title})`)
    this.setState('threads', this.currentThreadIndex, 'title', title)
    this.saveThread()
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

  regenerate(message: Message) {
    const currentThread = this.currentThread
    if (!currentThread) return

    const messages = currentThread.messages
    let index = messages.findIndex((m) => m.id === message.id)

    if (messages[index].role ==='user') {
      index += 1
    }

    const slice = messages.slice(0, index)

    const currentThreadIndex = this.currentThreadIndex
    this.setState('threads', currentThreadIndex, 'messages', slice)
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

  getMessages(): ChatMessage[] {
    const currentThread = this.currentThread
    if (!currentThread) return []
    const messages = []

    for (const message of currentThread.messages) {
      if (message.error) {
        continue
      }

      messages.push({role: message.role, content: message.content})
    }

    // final must be role user
    if (messages[messages.length - 1]?.role !== 'user') {
      return []
    }

    return [
      {
        role: 'system',
        content:
          'Keep attributes on fenced code blocks if present: e.g. ```rust id=1 range=1-5. Keep indentation in code blocks',
      },
      ...messages,
    ]
  }
}
