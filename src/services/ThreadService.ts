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
    info(`Add new message to thread (message=${JSON.stringify(message)})`)
    this.updateThread({
      messages: [...currentThread.messages, message],
      lastModified: new Date(),
    })

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
    this.updateThread({messages, lastModified: new Date()})

    const updated = this.currentThread
    if (updated.title) {
      await DB.updateThread(unwrap(updated))
    }
  }

  async clear() {
    const currentThread = this.currentThread
    if (!currentThread) return
    info(`Clear current thread (id=${currentThread.id})`)
    this.updateThread({messages: [], lastModified: new Date()})
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
        role: 'user',
        content: 'What title would you give this conversation. Return only the name',
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
        role: 'system',
        content: 'Keep attributes on fenced code blocks if present: e.g. ```rust id=1 range=1-5. Omit containers that start and end with ":::". Also keep indentation in code blocks',
      },
      ...messages,
    ]
  }

  private updateThread(u: Partial<Thread>) {
    const index = this.currentThreadIndex
    if (index === -1) return
    const update = {...u}
    this.setState('threads', index, update)
  }
}
