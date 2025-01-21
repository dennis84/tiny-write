import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import {Message, State, Thread} from '@/state'
import {DB} from '@/db'
import {info} from '@/remote/log'
import {CopilotService} from './CopilotService'

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

    const updated = this.currentThread
    if (updated.title) {
      await DB.updateThread(unwrap(updated))
    }
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

    const updated = this.currentThread
    if (updated.title) {
      await DB.updateThread(unwrap(updated))
    }
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

    const updated = this.currentThread
    if (updated.title) {
      await DB.updateThread(unwrap(updated))
    }
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

    const updated = this.currentThread
    if (updated.title) {
      await DB.updateThread(unwrap(updated))
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

  async deleteAll() {
    for (const thread of this.store.threads) {
      await DB.deleteThread(thread.id)
    }

    this.setState('threads', [])
    this.newThread()
  }

  async generateTitle(): Promise<string | undefined> {
    const currentThread = this.currentThread
    if (!currentThread) return

    return new Promise((resolve, reject) => {
      const question: Message = {
        id: 'generate_title',
        role: 'user',
        content:
          "Generate a concise 3-7 word title for this conversation, omitting punctuation. Go straight to the title, without any preamble and prefix like `Here's a concise suggestion:...` or `Title:`",
      }

      let title: string

      return this.copilotService.completions(
        [...currentThread.messages, question],
        (chunk) => {
          title = chunk.choices?.[0]?.message?.content
        },
        () => {
          if (title) resolve(title)
          else reject('Cannot guess a title for current thread.')
        },
        false,
      )
    })
  }

  getMessages(): Message[] {
    const currentThread = this.currentThread
    if (!currentThread) return []
    const messages = currentThread.messages.filter((m) => !m.error)
    // final must be role user
    if (messages[messages.length - 1].role !== 'user') {
      return []
    }

    return [
      {
        id: 'code_blocks',
        role: 'system',
        content:
          'Keep attributes on fenced code blocks if present: e.g. ```rust id=1 range=1-5. Omit containers that start and end with ":::". Also keep indentation in code blocks',
      },
      ...messages,
    ]
  }
}
