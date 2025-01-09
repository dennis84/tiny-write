import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import {createState, Message} from '@/state'
import {ThreadService} from '@/services/ThreadService'

beforeEach(() => {
  vi.restoreAllMocks()
})

vi.mock('@/db', () => ({DB: mock()}))

const createMessage = (props: Partial<Message>): Message => ({
  role: 'user',
  content: '1',
  ...props,
})

const lastModified = new Date()

test('newThread', () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        messages: [],
      },
      {
        id: '2',
        active: false,
        lastModified,
        messages: [
          {role: 'user', content: 'test'},
          {role: 'assistant', content: 'test'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const service = new ThreadService(store, setState)

  service.newThread()

  expect(store.threads).toHaveLength(2)
  expect(store.threads[0].active).toBe(false)
  expect(store.threads[1].active).toBe(true)
})

test('addMessage', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        messages: [],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const service = new ThreadService(store, setState)

  await service.addMessage({role: 'user', content: '1'})
  await service.addMessage({role: 'user', content: '2'})

  expect(store.threads[0].messages).toHaveLength(2)
})

test('removeMessage', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        messages: [{role: 'user', content: '1'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const service = new ThreadService(store, setState)

  await service.removeMessage(store.threads[0].messages[0])

  expect(store.threads[0].messages).toHaveLength(0)
})

test('clear', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        messages: [{role: 'user', content: '1'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const service = new ThreadService(store, setState)

  await service.clear()

  expect(store.threads[0].messages).toHaveLength(0)
})

test('setError', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        messages: [{role: 'user', content: '1'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const service = new ThreadService(store, setState)

  service.setError('fail')

  expect(store.threads[0].messages[0].error).toBe('fail')
})

test('open', () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        messages: [],
      },
      {
        id: '2',
        active: false,
        lastModified,
        messages: [
          {role: 'user', content: '1'},
          {role: 'assistant', content: '2'},
        ],
      },
      {
        id: '3',
        active: false,
        lastModified,
        messages: [
          {role: 'user', content: '3'},
          {role: 'assistant', content: '4'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const service = new ThreadService(store, setState)

  service.open('2')

  expect(store.threads).toHaveLength(2)
  expect(store.threads[0].active).toBe(true)
  expect(store.threads[1].active).toBe(false)

  service.open('3')

  expect(store.threads).toHaveLength(2)
  expect(store.threads[0].active).toBe(false)
  expect(store.threads[1].active).toBe(true)
})

test('deleteAll', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: false,
        lastModified,
        messages: [
          {role: 'user', content: '1'},
          {role: 'assistant', content: '2'},
        ],
      },
      {
        id: '2',
        active: false,
        lastModified,
        messages: [
          {role: 'user', content: '3'},
          {role: 'assistant', content: '4'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const service = new ThreadService(store, setState)

  await service.deleteAll()

  expect(store.threads).toHaveLength(1)
  expect(store.threads[0].id).not.toBe('1')
  expect(store.threads[0].id).not.toBe('2')
})

test.each([
  {messages: [], lastModified, expected: true},
  {messages: [], lastModified: undefined, expected: true},
  {messages: [createMessage({role: 'user'})], lastModified, expected: true},
  {
    messages: [createMessage({role: 'user'}), createMessage({role: 'assistant'})],
    lastModified,
    expected: false,
  },
  {
    messages: [createMessage({role: 'user'}), createMessage({role: 'assistant'})],
    lastModified: undefined,
    expected: true,
  },
])('isThreadEmpty', ({messages, lastModified, expected}) => {
  const initial = createState()
  const [store, setState] = createStore(initial)
  const service = new ThreadService(store, setState)
  const thread = {id: '1', active: true, messages, lastModified}

  expect(service.isThreadEmpty(thread)).toBe(expected)
})
