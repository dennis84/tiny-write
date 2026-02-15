import {createStore} from 'solid-js/store'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {ChatMessageTextContent, CopilotService} from '@/services/CopilotService'
import type {LocationService} from '@/services/LocationService'
import {ThreadService} from '@/services/ThreadService'
import {createState} from '@/state'
import {AttachmentType, type Message} from '@/types'
import {expectTree} from '../testutil/tree'

beforeEach(() => {
  vi.resetAllMocks()
})

vi.mock('@/db', () => ({DB: mock()}))

const lastModified = new Date()

test('newThread - empty', () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        messages: [],
      },
      {
        id: '2',
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
  const locationService = mock<LocationService>()
  const service = new ThreadService(store, setState, copilotService, locationService)

  service.newThread()

  expect(store.threads).toHaveLength(2)
})

test('addMessage', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        messages: [],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)

  await service.addMessage({id: '1', role: 'user', content: '1'})
  await service.addMessage({id: '2', role: 'user', content: '2'})

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
      └ 2 (parentId=1, leftId=)
    `,
  )
})

test('addMessage - path', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        messages: [
          {id: '1', role: 'user', content: '1'},
          {id: '2', role: 'user', content: '2'},
        ],
        path: new Map([[undefined, '1']]),
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)
  service.messageTree.updateAll(store.threads[0].messages)

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
    └ 2 (parentId=, leftId=)
    `,
  )

  const messages1 = service.getMessages()
  expect(messages1.messages).toHaveLength(1)
  expect(messages1.parentId).toBe('1')

  await service.addMessage({id: '3', role: 'user', content: '3'})

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
      └ 3 (parentId=1, leftId=)
    └ 2 (parentId=, leftId=)
    `,
  )

  const messages2 = service.getMessages()
  expect(messages2.parentId).toBe('3')
  expect(messages2.nextId).toBe(undefined)
})

test('addChunk', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        messages: [{id: '1', role: 'user', content: 'Test'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)
  service.messageTree.updateAll(store.threads[0].messages)

  service.addChunk('2', '1', 'A')
  expect(store.threads[0].messages[1].content).toBe('A')
  service.addChunk('2', '1', 'b')
  expect(store.threads[0].messages[1].content).toBe('Ab')
  service.addChunk('2', '1', 'c')
  expect(store.threads[0].messages[1].content).toBe('Abc')

  expect(store.threads[0].messages).toHaveLength(2)
  expect(store.threads[0].messages[1].parentId).toBe('1')
})

test('removeMessage', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        messages: [{id: '1', role: 'user', content: '1'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)
  service.messageTree.updateAll(store.threads[0].messages)

  await service.removeMessage(store.threads[0].messages[0])

  expect(store.threads[0].messages).toHaveLength(0)
})

test('interrupt', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        messages: [
          {id: '1', role: 'user', content: '1'},
          {id: '2', role: 'user', content: '2'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)

  service.interrupt('2')

  expect(store.threads[0].messages[1].interrupted).toEqual(true)
})

test('summarize', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        messages: [
          {id: '1', role: 'user', content: '1'},
          {id: '2', parentId: '1', role: 'assistant', content: '2'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService, 2)
  service.messageTree.updateAll(store.threads[0].messages)

  copilotService.completionsSync.mockResolvedValue('12')

  await service.summarize()

  expect(store.threads[0].messages[1].summary).toEqual('12')
})

test('updateTitle', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        messages: [{id: '1', role: 'user', content: '1'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)

  await service.updateTitle('1', 'Test')

  expect(store.threads[0].title).toBe('Test')
})

test('init', () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        title: '1',
        lastModified,
        messages: [
          {id: '1', role: 'user', content: '1'},
          {id: '2', parentId: '1', role: 'assistant', content: '2'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)

  service.init()
  expect(store.threads).toHaveLength(1)
  expect(service.messageTree.rootItemIds).toEqual(['1'])
})

test('delete', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        lastModified,
        messages: [
          {id: '1', role: 'user', content: '1'},
          {id: '2', role: 'assistant', content: '2'},
        ],
      },
      {
        id: '2',
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
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)

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
        lastModified,
        messages: [
          {id: '1', role: 'user', content: '1'},
          {id: '2', role: 'assistant', content: '2'},
        ],
      },
      {
        id: '2',
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
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)

  await service.deleteAll()

  expect(store.threads).toHaveLength(1)
  expect(store.threads[0].id).not.toBe('1')
  expect(store.threads[0].id).not.toBe('2')
})

test('regenerate - user message', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        messages: [
          {id: '1', role: 'user', content: '1'},
          {id: '2', parentId: '1', role: 'assistant', content: '2'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)
  service.messageTree.updateAll(store.threads[0].messages)

  let nextId = 3
  vi.spyOn(ThreadService, 'createId').mockImplementation(() => String(nextId++))

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
      └ 2 (parentId=1, leftId=)
    `,
  )

  await service.regenerate({id: '1', role: 'user', content: '111'})

  expect(service.messageTree.rootItemIds).toHaveLength(2)

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
      └ 2 (parentId=1, leftId=)
    └ 3 (parentId=, leftId=1)
    `,
  )

  expect(service.currentThread?.path?.size).toBe(1)
  expect(service.currentThread?.path?.get(undefined)).toBe('3')

  const {messages} = service.getMessages()
  const message = messages[0].content[0] as ChatMessageTextContent
  expect(message.text).toBe('111')
})

test('regenerate - assistant message', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        messages: [
          {id: '1', role: 'user', content: '1'},
          {id: '2', parentId: '1', role: 'assistant', content: '2'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)
  service.messageTree.updateAll(store.threads[0].messages)

  let nextId = 3
  vi.spyOn(ThreadService, 'createId').mockImplementation(() => String(nextId++))

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
      └ 2 (parentId=1, leftId=)
    `,
  )

  await service.regenerate(store.threads[0].messages[1])

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
      └ 2 (parentId=1, leftId=)
    `,
  )

  expect(service.currentThread?.path?.get('1')).toBe('3')

  const result = service.getMessages()
  expect(result.messages).toHaveLength(1)
  expect(result.nextId).toBeDefined()
})

test('generateTitle', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
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
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)

  copilotService.completionsSync.mockImplementation(async (messages) => {
    expect(messages).toHaveLength(3)
    const message = messages[2].content.find((c) => c.type === 'text')
    expect(message?.text).toContain('Generate a concise')

    return 'Test'
  })

  const title = await service.generateTitle()

  expect(title).toBe('Test')
})

test.each<[Message[], number]>([
  [[], 0], // empty
  [[{id: '1', role: 'assistant', content: ''}], 1], // last message assistant
  [[{id: '1', role: 'user', content: '```'}], 2], // code block prompt added
  [
    [
      {id: '1', role: 'user', content: 'A'},
      {id: '2', parentId: '1', role: 'assistant', content: 'B'},
      {id: '3', parentId: '2', role: 'user', content: 'C'},
      {id: '4', parentId: '3', role: 'assistant', content: 'D'},
      {id: '5', parentId: '4', role: 'user', content: 'E'},
    ],
    5, // full conversation
  ],
  [
    [
      {id: '1', role: 'user', content: 'A A A A'},
      {id: '2', parentId: '1', role: 'assistant', content: 'B B B B'},
      {id: '3', parentId: '2', role: 'user', content: 'C C C C'},
      {id: '4', parentId: '3', role: 'assistant', content: 'D', summary: 'ABCD'},
      {id: '5', parentId: '4', role: 'user', content: 'E'},
    ],
    2, // token limit not reached
  ],
  [
    [
      {id: '1', role: 'user', content: 'A A A A'},
      {id: '2', parentId: '1', role: 'assistant', content: 'B B B B'},
      {id: '3', parentId: '2', role: 'user', content: 'C C C C'},
      {id: '4', parentId: '3', role: 'assistant', content: 'D D D D', summary: 'ABCD'},
      {id: '5', parentId: '4', role: 'user', content: 'E'},
      {id: '6', parentId: '5', role: 'assistant', content: 'F'},
      {id: '7', parentId: '6', role: 'user', content: 'G'},
    ],
    4, // token limit reached, filter to last summary
  ],
])('getMessages', async (messages, count) => {
  const initial = createState({
    threads: [
      {
        id: '1',
        lastModified,
        messages,
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService, 5, 16)
  service.messageTree.updateAll(store.threads[0].messages)

  const result = service.getMessages()

  expect(result.messages).toHaveLength(count)
})

test('getThreads', () => {
  const createThread = (id: string, lastModified: Date) => ({
    id,
    title: id,
    lastModified,
    messages: [],
  })

  const thread1 = createThread('1', new Date('2024-01-01'))
  const thread2 = createThread('2', new Date('2025-09-01'))
  const thread3 = createThread('3', new Date('2025-11-01'))
  const thread4 = createThread('4', new Date('2025-11-02'))
  const thread5 = createThread('5', new Date())
  const thread6 = createThread('6', new Date())

  const initial = createState({
    threads: [thread6, thread5, thread4, thread3, thread2, thread1],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)

  const threads = service.getThreads()

  expect(threads).toEqual([
    [thread6, 'Today'],
    [thread5, undefined],
    [thread4, 'November'],
    [thread3, undefined],
    [thread2, 'September'],
    [thread1, 'January'],
  ])
})

test('hande attachments', () => {
  const initial = createState()
  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const locationService = mock<LocationService>()
  Object.defineProperty(locationService, 'threadId', {get: vi.fn().mockReturnValue('1')})

  const service = new ThreadService(store, setState, copilotService, locationService)

  expect(service.attachments()).toEqual([])

  const createAttachment = (type: AttachmentType, fileId?: string, name?: string) => ({
    type,
    fileId,
    name,
    content: '',
  })

  service.addAttachment(createAttachment(AttachmentType.File, '1'))
  expect(service.attachments()).toHaveLength(1)

  service.addAttachment(createAttachment(AttachmentType.File, '1'))
  expect(service.attachments()).toHaveLength(1)

  service.addAttachment(createAttachment(AttachmentType.File, '2'))
  expect(service.attachments()).toHaveLength(2)

  service.addAttachment(createAttachment(AttachmentType.File, '2', 'name'))
  expect(service.attachments()).toHaveLength(2)

  service.addAttachment(createAttachment(AttachmentType.File, '3', 'name'))
  expect(service.attachments()).toHaveLength(2)
  expect(service.attachments()[1].fileId).toBe('3')

  service.addAttachment(createAttachment(AttachmentType.Selection, '3'))
  expect(service.attachments()).toHaveLength(2)

  service.setAttachments([])
  expect(service.attachments()).toHaveLength(0)
})
