import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import {Message, State, Thread} from '@/state'
import {DB} from '@/db'
import {info} from '@/remote/log'

export class ThreadService {
  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
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
      if (!this.isThreadEmpty(cur)) {
        threads.push({...cur, active: false})
      }
    }

    threads.push(thread)
    this.setState('threads', threads)
  }

  async addMessage(message: Message) {
    const currentThread = this.currentThread
    if (!currentThread) return
    info(`Add new message to thread (message=${message})`)
    this.updateThread({
      messages: [...currentThread.messages, message],
      lastModified: new Date(),
    })

    const updated = this.currentThread
    if (!this.isThreadEmpty(updated)) {
      await DB.updateThread(unwrap(updated))
    }
  }

  async removeMessage(message: Message) {
    const currentThread = this.currentThread
    if (!currentThread) return
    info(`Remove message from thread (message=${message})`)
    const index = currentThread.messages.indexOf(message)
    const messages = currentThread.messages.filter((_, i) => i !== index)
    this.updateThread({messages, lastModified: new Date()})

    const updated = this.currentThread
    if (!this.isThreadEmpty(updated)) {
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

  open(threadId: string) {
    info(`Open thread (id=${threadId})`)
    const threads = []
    for (let i = 0; i < this.store.threads.length; i++) {
      const cur = this.store.threads[i]
      if (cur.id === threadId) {
        threads.push({...cur, active: true})
      } else if (!this.isThreadEmpty(cur)) {
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

  isThreadEmpty(thread: Thread): boolean {
    return (
      !thread.lastModified || thread.messages.filter((m) => m.role === 'assistant').length === 0
    )
  }

  private updateThread(u: Partial<Thread>) {
    const index = this.currentThreadIndex
    if (index === -1) return
    const update = {...u}
    this.setState('threads', index, update)
  }
}
