import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import {createState, Message} from '@/state'
import {ThreadService} from '@/services/ThreadService'
import {CopilotService} from '@/services/CopilotService'

beforeEach(() => {
  vi.restoreAllMocks()
})

vi.mock('@/db', () => ({DB: mock()}))

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
        title: 'Test',
        lastModified,
        messages: [
          {id: '1', role: 'user', content: 'test'},
          {id: '2', role: 'assistant', content: 'test'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()

  const service = new ThreadService(store, setState, copilotService)

  service.newThread()

  expect(store.threads).toHaveLength(2)
  expect(store.threads[0].active).toBe(true)
  expect(store.threads[1].active).toBe(false)
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
  const copilotService = mock<CopilotService>()
  const service = new ThreadService(store, setState, copilotService)

  await service.addMessage({id: '1', role: 'user', content: '1'})
  await service.addMessage({id: '2', role: 'user', content: '2'})

  expect(store.threads[0].messages).toHaveLength(2)
})

test('streamLastMessage', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        messages: [{id: '1', role: 'user', content: 'Test'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const service = new ThreadService(store, setState, copilotService)

  service.streamLastMessage('2', 'A')
  expect(store.threads[0].messages[1].content).toBe('A')
  service.streamLastMessage('2', 'b')
  expect(store.threads[0].messages[1].content).toBe('Ab')
  service.streamLastMessage('2', 'c')
  expect(store.threads[0].messages[1].content).toBe('Abc')

  expect(store.threads[0].messages).toHaveLength(2)
  expect(store.threads[0].messages[1].streaming).toBeTruthy()

  service.streamLastMessageEnd('2')
  expect(store.threads[0].messages[1].streaming).toBeFalsy()
})

test('updateMessage', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        messages: [{id: '1', role: 'user', content: '1'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const service = new ThreadService(store, setState, copilotService)

  await service.updateMessage({id: '1', role: 'user', content: '111'})

  expect(store.threads[0].messages).toHaveLength(1)
  expect(store.threads[0].messages[0].content).toBe('111')
})

test('removeMessage', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        messages: [{id: '1', role: 'user', content: '1'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const service = new ThreadService(store, setState, copilotService)

  await service.removeMessage(store.threads[0].messages[0])

  expect(store.threads[0].messages).toHaveLength(0)
})

test('clear', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        messages: [{id: '1', role: 'user', content: '1'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const service = new ThreadService(store, setState, copilotService)

  await service.clear()

  expect(store.threads[0].messages).toHaveLength(0)
})

test('setError', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        messages: [{id: '1', role: 'user', content: '1'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const service = new ThreadService(store, setState, copilotService)

  service.setError('fail')

  expect(store.threads[0].messages[0].error).toBe('fail')
})

test('updateTitle', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        messages: [{id: '1', role: 'user', content: '1'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const service = new ThreadService(store, setState, copilotService)

  service.updateTitle('Test')

  expect(store.threads[0].title).toBe('Test')
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
        title: '1',
        lastModified,
        messages: [
          {id: '1', role: 'user', content: '1'},
          {id: '2', role: 'assistant', content: '2'},
        ],
      },
      {
        id: '3',
        active: false,
        title: '2',
        lastModified,
        messages: [
          {id: '3', role: 'user', content: '3'},
          {id: '4', role: 'assistant', content: '4'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const service = new ThreadService(store, setState, copilotService)

  service.open('2')

  expect(store.threads).toHaveLength(2)
  expect(store.threads[0].active).toBe(true)
  expect(store.threads[1].active).toBe(false)

  service.open('3')

  expect(store.threads).toHaveLength(2)
  expect(store.threads[0].active).toBe(false)
  expect(store.threads[1].active).toBe(true)
})

test('delete', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: false,
        lastModified,
        messages: [
          {id: '1', role: 'user', content: '1'},
          {id: '2', role: 'assistant', content: '2'},
        ],
      },
      {
        id: '2',
        active: false,
        lastModified,
        messages: [
          {id: '3', role: 'user', content: '3'},
          {id: '4', role: 'assistant', content: '4'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const service = new ThreadService(store, setState, copilotService)

  await service.delete(store.threads[0])

  expect(store.threads).toHaveLength(1)
  expect(store.threads[0].id).toBe('2')

  await service.delete(store.threads[0])
  expect(store.threads).toHaveLength(0)
})

test('deleteAll', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: false,
        lastModified,
        messages: [
          {id: '1', role: 'user', content: '1'},
          {id: '2', role: 'assistant', content: '2'},
        ],
      },
      {
        id: '2',
        active: false,
        lastModified,
        messages: [
          {id: '3', role: 'user', content: '3'},
          {id: '4', role: 'assistant', content: '4'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const service = new ThreadService(store, setState, copilotService)

  await service.deleteAll()

  expect(store.threads).toHaveLength(1)
  expect(store.threads[0].id).not.toBe('1')
  expect(store.threads[0].id).not.toBe('2')
})

test('generateTitle', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        lastModified,
        messages: [
          {id: '1', role: 'user', content: '1'},
          {id: '2', role: 'assistant', content: '2'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const service = new ThreadService(store, setState, copilotService)

  copilotService.completions.mockImplementation(async (messages, onChunk, onDone) => {
    expect(messages).toHaveLength(3)
    expect(messages[2].content.startsWith('Generate a concise')).toBeTruthy()
    const choices = [{message: {content: 'Test'}}]
    onChunk({choices})
    onDone()
  })

  const title = await service.generateTitle()

  expect(title).toBe('Test')
})

test.each<[Message[], number]>([
  [[], 0],
  [[{id: '1', role: 'assistant', content: ''}], 0],
  [
    [
      {id: '1', role: 'user', content: ''},
      {id: '2', role: 'user', content: '', error: 'error'},
    ],
    2,
  ],
])('getMessages', async (messages, count) => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
        lastModified,
        messages,
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const service = new ThreadService(store, setState, copilotService)

  const result = service.getMessages()

  expect(result).toHaveLength(count)
})
