import {waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {DB} from '@/db'
import type {AiService} from '@/services/AiService'
import type {DialogService} from '@/services/DialogService'
import type {FileService} from '@/services/FileService'
import type {LocationService} from '@/services/LocationService'
import {ThreadService} from '@/services/ThreadService'
import type {TreeService} from '@/services/TreeService'
import {
  AttachmentType,
  type FileAttachment,
  type ImageAttachment,
  type Message,
  type ProjectAttachment,
  type SelectionAttachment,
} from '@/types'
import {createFile, createThread} from '../testutil/data'
import {expectTree} from '../testutil/tree'

const fileService = mock<FileService>()
const aiService = mock<AiService>({
  chatModel: {
    maxPromptTokens: 2,
    maxOutputTokens: 2,
  },
})
const locationService = mock<LocationService>({threadId: '1'})
const dialogService = mock<DialogService>()
const treeService = mock<TreeService>()

beforeEach(() => {
  vi.resetAllMocks()
})

vi.mock('@/prompts/common/rules.md?raw', () => {
  return {default: 'common/rules'}
})

vi.mock('@/prompts/assistant/common.md?raw', () => {
  return {default: 'assistant/common'}
})

vi.mock('@/prompts/assistant/code-block-handling.md?raw', () => {
  return {default: 'assistant/code-block-handling'}
})

vi.mock('@/prompts/common/user-message.md?raw', () => {
  return {default: '{{message}}'}
})

vi.mock('@/db', () => ({
  DB: mock({
    getThreads: vi.fn(),
  }),
}))

test('newThread - empty', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages: [
        {id: '1', role: 'user', content: 'test'},
        {id: '2', role: 'assistant', content: 'test'},
      ],
    }),
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  const newThread = service.newThread()

  expect(newThread.id).not.toEqual('1')

  const anotherNewThread = service.newThread()

  expect(anotherNewThread.id).toEqual(newThread.id)
})

test('addMessage', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([createThread({id: '1'})])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  await service.addMessage({id: '1', role: 'user', content: '1'})
  await service.addMessage({id: '2', role: 'assistant', content: '2'})
  await service.addMessage({id: '3', role: 'user', content: '3'})

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
      └ 2 (parentId=1, leftId=)
        └ 3 (parentId=2, leftId=)
    `,
  )
})

test('addMessage - path', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages: [
        {id: '1', role: 'user', content: '1'},
        {id: '2', role: 'user', content: '2'},
      ],
      path: new Map([[undefined, '1']]),
    }),
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  await service.init()

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
    └ 2 (parentId=, leftId=)
    `,
  )

  const messages1 = service.getThreadContext()
  expect(messages1.messages).toHaveLength(1)
  expect(messages1.parentId).toBe('1')
  expect(messages1.nextId).toBe(undefined)

  await service.addMessage({id: '3', role: 'user', content: '3'})

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
    └ 2 (parentId=, leftId=)
    └ 3 (parentId=, leftId=)
    `,
  )

  const messages2 = service.getThreadContext()
  expect(messages2.parentId).toBe('3')
  expect(messages2.nextId).toBe(undefined)
})

test('addChunk', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages: [{id: '1', role: 'user', content: 'Test'}],
    }),
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  await service.init()

  service.addChunk('2', '1', 'A')
  expect(service.currentThread?.messages[1].content).toBe('A')
  service.addChunk('2', '1', 'b')
  expect(service.currentThread?.messages[1].content).toBe('Ab')
  service.addChunk('2', '1', 'c')
  expect(service.currentThread?.messages[1].content).toBe('Abc')

  expect(service.currentThread?.messages).toHaveLength(2)
  expect(service.currentThread?.messages[1].parentId).toBe('1')
})

test('sendMessages - dedup tool calls by id', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages: [{id: 'u1', role: 'user', content: 'search for something'}],
    }),
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  await service.init()

  aiService.completions.mockImplementation(async (_messages, onChunk, onToolCall) => {
    onChunk('Here is what I found')
    onToolCall?.({
      id: 'call_1',
      toolName: 'braveSearch',
      status: 'tool-call',
      input: {query: 'foo'},
    })
    onToolCall?.({
      id: 'call_1',
      toolName: 'braveSearch',
      status: 'tool-result',
      input: {query: 'foo'},
      result: [{title: 'Foo result', url: 'https://example.com/foo', description: ''}],
    })
    return {success: true}
  })

  await service.sendMessages()

  const assistantMessage = service.currentThread?.messages.find((m) => m.role === 'assistant')
  expect(assistantMessage?.toolCalls).toHaveLength(1)
  expect(assistantMessage?.toolCalls?.[0]).toMatchObject({
    id: 'call_1',
    toolName: 'braveSearch',
    status: 'tool-result',
    input: {query: 'foo'},
    result: [{title: 'Foo result', url: 'https://example.com/foo', description: ''}],
  })
})

test('interrupt', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages: [
        {id: '1', role: 'user', content: '1'},
        {id: '2', role: 'user', content: '2'},
      ],
    }),
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  service.interrupt('2')

  expect(service.currentThread?.messages[1].interrupted).toEqual(true)
})

test('summarize', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages: [
        {id: '1', role: 'user', content: '1'},
        {id: '2', parentId: '1', role: 'assistant', content: '2'},
      ],
    }),
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  await service.init()

  aiService.completionsSync.mockResolvedValue('12')

  await service.summarize()

  expect(service.currentThread?.messages[1].summary).toEqual('12')
})

test('updateTitle', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages: [{id: '1', role: 'user', content: '1'}],
    }),
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  await service.updateTitle('1', 'Test')

  expect(service.currentThread?.title).toBe('Test')
})

test('init', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages: [
        {id: '1', role: 'user', content: '1'},
        {id: '2', parentId: '1', role: 'assistant', content: '2'},
      ],
    }),
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  await service.init()

  expect(service.currentThread?.currentInput).toEqual(undefined)
  expect(service.messageTree.rootItemIds).toEqual(['1'])
})

test('init - newThread', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({id: '1', messages: [], parentId: 'file_1'}),
  ])

  const file = createFile({id: 'file_1'})

  treeService.getItem.mockReturnValue({id: file.id, childrenIds: [], value: file})
  fileService.createAttachment.mockReturnValue({
    content: 'Test 123',
    type: AttachmentType.File,
    fileId: file.id,
  })

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  await service.init()

  expect(service.currentThread?.currentInput).toEqual('Test 123')
})

test('delete', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages: [
        {id: '1', role: 'user', content: '1'},
        {id: '2', role: 'assistant', content: '2'},
      ],
    }),
    createThread({
      id: '2',
      messages: [
        {id: '3', role: 'user', content: '3'},
        {id: '4', role: 'assistant', content: '4'},
      ],
    }),
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  expect(service.threads).toHaveLength(2)

  await service.delete('1')

  expect(service.threads).toHaveLength(2)
  expect(service.threads?.[0].deleted).toBe(true)

  await service.delete('1', true)
  expect(service.threads).toHaveLength(1)
  expect(service.threads?.[0].id).toBe('2')

  await service.delete('2', true)
  expect(service.threads).toHaveLength(0)
})

test('deleteAll', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages: [
        {id: '1', role: 'user', content: '1'},
        {id: '2', role: 'assistant', content: '2'},
      ],
    }),
    createThread({
      id: '2',
      messages: [
        {id: '3', role: 'user', content: '3'},
        {id: '4', role: 'assistant', content: '4'},
      ],
    }),
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  await service.deleteAll()

  expect(service.threads).toHaveLength(1)
})

test('regenerate - user message', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages: [
        {id: '1', role: 'user', content: '1'},
        {id: '2', parentId: '1', role: 'assistant', content: '2'},
      ],
    }),
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  await service.init()

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

  const {messages} = service.getThreadContext()
  expect(messages[0].content[0]).toMatchObject({
    type: 'text',
    text: '111',
  })
})

test('regenerate - assistant message', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages: [
        {id: '1', role: 'user', content: '1'},
        {id: '2', parentId: '1', role: 'assistant', content: '2'},
      ],
    }),
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  await service.init()

  let nextId = 3
  vi.spyOn(ThreadService, 'createId').mockImplementation(() => String(nextId++))

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
      └ 2 (parentId=1, leftId=)
    `,
  )

  await service.regenerate(service.threads![0].messages[1])

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
      └ 2 (parentId=1, leftId=)
    `,
  )

  expect(service.currentThread?.path?.get('1')).toBe('3')

  const result = service.getThreadContext()
  expect(result.messages).toHaveLength(1)
  expect(result.nextId).toBeDefined()
})

test('generateTitle', async () => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages: [
        {id: '1', role: 'user', content: '1'},
        {id: '2', role: 'assistant', content: '2'},
      ],
    }),
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  aiService.completionsSync.mockImplementation(async (messages) => {
    expect(messages).toHaveLength(3)
    expect(messages[2].content).toContain('Generate a concise')

    return 'Test'
  })

  const title = await service.generateTitle()

  expect(title).toBe('Test')
})

test.each<[Message[], number, number]>([
  [[], 2, 0],
  [[{id: '1', role: 'assistant', content: ''}], 2, 1],
  [[{id: '1', role: 'user', content: '```'}], 3, 1],
  [
    [
      {id: '1', role: 'user', content: 'A'},
      {id: '2', parentId: '1', role: 'assistant', content: 'B'},
      {id: '3', parentId: '2', role: 'user', content: 'C'},
      {id: '4', parentId: '3', role: 'assistant', content: 'D'},
      {id: '5', parentId: '4', role: 'user', content: 'E'},
    ],
    2,
    5,
  ],
  [
    [
      {id: '1', role: 'user', content: 'A A'},
      {id: '2', parentId: '1', role: 'assistant', content: 'B B'},
      {id: '3', parentId: '2', role: 'user', content: 'C C'},
      {id: '4', parentId: '3', role: 'assistant', content: 'D', summary: 'ABCD'},
      {id: '5', parentId: '4', role: 'user', content: 'E'},
    ],
    2,
    5,
  ],
  [
    [
      {id: '1', role: 'user', content: 'A A A A'},
      {id: '2', parentId: '1', role: 'assistant', content: 'B'},
      {id: '3', parentId: '2', role: 'user', content: 'C C C C'},
      {id: '4', parentId: '3', role: 'assistant', content: 'D', summary: 'ABCD'},
      {id: '5', parentId: '4', role: 'user', content: 'E'},
      {id: '6', parentId: '5', role: 'assistant', content: 'F'},
      {id: '7', parentId: '6', role: 'user', content: 'G'},
    ],
    3,
    3,
  ],
  [
    [
      {id: '1', role: 'user', content: 'A'},
      {id: '2', parentId: '1', role: 'assistant', content: 'B B B B B B'},
      {id: '3', parentId: '2', role: 'user', content: 'C'},
      {id: '4', parentId: '3', role: 'assistant', content: 'D D D D D D', summary: 'ABCD'},
      {id: '5', parentId: '4', role: 'user', content: 'E'},
      {id: '6', parentId: '5', role: 'assistant', content: 'F'},
      {id: '7', parentId: '6', role: 'user', content: 'G'},
    ],
    3,
    3,
  ],
])('getThreadContext', async (messages, systemCount, messagesCount) => {
  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    createThread({
      id: '1',
      messages,
    }),
  ])

  vi.spyOn(aiService, 'chatModel', 'get').mockReturnValue({
    ...aiService.chatModel!,
    maxPromptTokens: 10,
    maxOutputTokens: 12,
  })

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.currentThread?.id).toEqual('1')
  })

  await service.init()

  const result = service.getThreadContext()

  expect(result.messages).toHaveLength(messagesCount)
  expect(result.system?.split('\n\n')).toHaveLength(systemCount)
})

test('searchThreads', async () => {
  const thread1 = createThread({id: '1', lastModified: new Date('2024-01-01')})
  const thread2 = createThread({id: '2', lastModified: new Date('2025-09-01')})
  const thread3 = createThread({id: '3', lastModified: new Date('2025-11-01')})
  const thread4 = createThread({id: '4', lastModified: new Date('2025-11-02')})
  const thread5 = createThread({id: '5', lastModified: new Date()})
  const thread6 = createThread({id: '6', lastModified: new Date()})

  vi.spyOn(DB, 'getThreads').mockResolvedValue([
    thread6,
    thread5,
    thread4,
    thread3,
    thread2,
    thread1,
  ])

  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  await waitFor(() => {
    expect(service.threads).toHaveLength(6)
  })

  const threads = await service.searchThreads('')

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
  const service = new ThreadService(
    fileService,
    aiService,
    locationService,
    dialogService,
    treeService,
  )

  expect(service.attachments()).toEqual([])

  const createFileAttachment = (props: Partial<FileAttachment>): FileAttachment => ({
    type: AttachmentType.File,
    content: '1',
    ...props,
  })

  const createSelectionAttachment = (props: Partial<SelectionAttachment>): SelectionAttachment => ({
    type: AttachmentType.Selection,
    content: '',
    selection: [[0, 0]],
    ...props,
  })

  const createImageAttachment = (props: Partial<ImageAttachment>): ImageAttachment => ({
    type: AttachmentType.Image,
    content: '',
    name: 'img',
    mediaType: 'image/png',
    ...props,
  })

  const createProjectAttachment = (props: Partial<ProjectAttachment>): ProjectAttachment => ({
    type: AttachmentType.Project,
    tree: 'TREE',
    files: [],
    projectId: '1',
    ...props,
  })

  service.addAttachment(createFileAttachment({fileId: '1', projectId: '1'}))
  expect(service.attachments()).toHaveLength(1)
  const attachment1 = service.attachments()[0]
  expect.assert(attachment1.type === AttachmentType.File)
  expect(attachment1.content).toEqual('1')

  service.addAttachment(createFileAttachment({fileId: '1', projectId: '1', content: '2'}))
  expect(service.attachments()).toHaveLength(1)
  const newAttachment = service.attachments()[0]
  expect.assert(newAttachment.type === AttachmentType.File)
  expect(newAttachment.content).toEqual('2')

  service.addAttachment(createFileAttachment({fileId: '2'}))
  expect(service.attachments()).toHaveLength(2)

  service.addAttachment(createSelectionAttachment({fileId: '2'}))
  expect(service.attachments()).toHaveLength(2)

  service.addAttachment(createImageAttachment({name: 'name'}))
  expect(service.attachments()).toHaveLength(3)

  service.addAttachment(createImageAttachment({name: 'name'}))
  expect(service.attachments()).toHaveLength(3)

  service.addAttachment(
    createProjectAttachment({
      projectId: '1',
      tree: 'TREE',
      files: [
        createFileAttachment({fileId: '1'}), // removes direct attachment
        createFileAttachment({fileId: '2'}), // keeps direct attachment, projectId is missing
        createFileAttachment({fileId: '3'}),
      ],
    }),
  )
  expect(service.attachments()).toHaveLength(3)

  // not added but updates file attachment in project
  service.addAttachment(createFileAttachment({fileId: '1', projectId: '1', content: '3'}))
  expect(service.attachments()).toHaveLength(3)
  expect((service.attachments()[2] as ProjectAttachment).files[2].content).toEqual('3')

  service.setAttachments([])
  expect(service.attachments()).toHaveLength(0)
})
