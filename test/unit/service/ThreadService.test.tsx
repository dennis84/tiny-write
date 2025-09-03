import {type EditorState, Text} from '@codemirror/state'
import type {EditorView} from '@codemirror/view'
import {createStore} from 'solid-js/store'
import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {ChatMessageTextContent, CopilotService} from '@/services/CopilotService'
import type {FileService} from '@/services/FileService'
import {ThreadService} from '@/services/ThreadService'
import {createState, type File, type Message, Page} from '@/state'
import {createYUpdate} from '../testutil/codemirror-util'
import {expectTree} from '../testutil/tree'

beforeEach(() => {
  vi.restoreAllMocks()
})

vi.mock('@/db', () => ({DB: mock()}))

const lastModified = new Date()

test('newThread - empty', () => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

  service.newThread()

  expect(store.threads).toHaveLength(2)
})

test('addMessage', async () => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
    threads: [
      {
        id: '1',
        messages: [],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

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
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)
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

test('streamLastMessage', async () => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
    threads: [
      {
        id: '1',
        messages: [{id: '1', role: 'user', content: 'Test'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)
  service.messageTree.updateAll(store.threads[0].messages)

  service.streamLastMessage('2', '1', 'A')
  expect(store.threads[0].messages[1].content).toBe('A')
  service.streamLastMessage('2', '1', 'b')
  expect(store.threads[0].messages[1].content).toBe('Ab')
  service.streamLastMessage('2', '1', 'c')
  expect(store.threads[0].messages[1].content).toBe('Abc')

  expect(store.threads[0].messages).toHaveLength(2)
  expect(store.threads[0].messages[1].parentId).toBe('1')
})

test('removeMessage', async () => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
    threads: [
      {
        id: '1',
        messages: [{id: '1', role: 'user', content: '1'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)
  service.messageTree.updateAll(store.threads[0].messages)

  await service.removeMessage(store.threads[0].messages[0])

  expect(store.threads[0].messages).toHaveLength(0)
})

test('setError', async () => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
    threads: [
      {
        id: '1',
        messages: [{id: '1', role: 'user', content: '1'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

  service.setError('fail')

  expect(store.threads[0].messages[0].error).toBe('fail')
})

test('updateTitle', async () => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
    threads: [
      {
        id: '1',
        messages: [{id: '1', role: 'user', content: '1'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

  await service.updateTitle('Test')

  expect(store.threads[0].title).toBe('Test')
})

test('open', () => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
    threads: [
      {
        id: '1',
        messages: [],
      },
      {
        id: '2',
        title: '1',
        lastModified,
        messages: [
          {id: '1', role: 'user', content: '1'},
          {id: '2', role: 'assistant', content: '2'},
        ],
      },
      {
        id: '3',
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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

  service.open('2')

  expect(store.threads).toHaveLength(2)

  service.open('4')

  expect(store.threads).toHaveLength(3)

  service.open('3')

  expect(store.threads).toHaveLength(2)
})

test('delete', async () => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

  await service.delete(store.threads[0])

  expect(store.threads).toHaveLength(1)
  expect(store.threads[0].id).toBe('2')

  await service.delete(store.threads[0])
  expect(store.threads).toHaveLength(0)
})

test('deleteAll', async () => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

  await service.deleteAll()

  expect(store.threads).toHaveLength(1)
  expect(store.threads[0].id).not.toBe('1')
  expect(store.threads[0].id).not.toBe('2')
})

test('regenerate - user message', async () => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)
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
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)
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

  expect(service.getMessages().messages).toHaveLength(0)

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
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

  copilotService.completions.mockImplementation(async (messages, onChunk, onDone) => {
    expect(messages).toHaveLength(3)
    const message = messages[2].content.find((c) => c.type === 'text')
    expect(message?.text).toContain('Generate a concise')

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
      {id: '2', parentId: '1', role: 'user', content: '', error: 'error'},
    ],
    1,
  ],
  [[{id: '1', role: 'user', content: '```'}], 2],
])('getMessages', async (messages, count) => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)
  service.messageTree.updateAll(store.threads[0].messages)

  const result = service.getMessages()

  expect(result.messages).toHaveLength(count)
})

test('insertAutoContext', async () => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', 'Code'),
        versions: [],
        lastModified,
        code: true,
      },
    ],
    threads: [
      {
        id: '1',
        lastModified,
        messages: [{id: '1', role: 'user', content: 'test'}],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)
  service.messageTree.updateAll(store.threads[0].messages)

  const codeEditorView = mock<EditorView>({
    state: mock<EditorState>({
      doc: Text.of(['123']),
    }),
  })

  const currentFile = mock<File>({
    codeEditorView: codeEditorView as any,
    id: '1',
    codeLang: 'typescript',
    path: '/path/to/file.ts',
  })

  vi.spyOn(ThreadService, 'createId').mockReturnValue('2')

  Object.defineProperty(fileService, 'currentFile', {get: vi.fn().mockReturnValue(currentFile)})

  await service.insertAutoContext()
  await service.insertAutoContext()

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
      └ 2 (parentId=1, leftId=)
    `,
  )
})

test('insertAutoContext - update', async () => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', 'Code'),
        versions: [],
        lastModified,
        code: true,
      },
    ],
    threads: [
      {
        id: '1',
        lastModified,
        messages: [
          {id: '1', role: 'user', content: 'message1'},
          {
            id: '2',
            role: 'user',
            content: '```typescript id=1\n123\n```',
            fileId: '1',
            parentId: '1',
          },
          {id: '3', role: 'assistant', content: 'response', parentId: '2'},
          {id: '4', role: 'user', content: 'message2', parentId: '3'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)
  service.messageTree.updateAll(store.threads[0].messages)

  const codeEditorView = mock<EditorView>({
    state: mock<EditorState>({
      doc: Text.of(['123', '456']),
    }),
  })

  const currentFile = mock<File>({
    codeEditorView: codeEditorView as any,
    id: '1',
    codeLang: 'typescript',
    path: '/path/to/file.ts',
  })

  Object.defineProperty(fileService, 'currentFile', {get: vi.fn().mockReturnValue(currentFile)})

  vi.spyOn(ThreadService, 'createId').mockReturnValue('5')

  await service.insertAutoContext()

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
      └ 2 (parentId=1, leftId=)
        └ 3 (parentId=2, leftId=)
          └ 4 (parentId=3, leftId=)
            └ 5 (parentId=4, leftId=)
    `,
  )
})

test('insertAutoContext - regenerate', async () => {
  const initial = createState({
    location: {
      page: Page.Assistant,
      threadId: '1',
    },
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', 'Code'),
        versions: [],
        lastModified,
        code: true,
      },
    ],
    threads: [
      {
        id: '1',
        lastModified,
        messages: [
          {id: '1', role: 'user', content: 'message1'},
          {id: '2', role: 'assistant', content: 'response', parentId: '1'},
        ],
      },
    ],
  })

  const [store, setState] = createStore(initial)
  const copilotService = mock<CopilotService>()
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)
  service.messageTree.updateAll(store.threads[0].messages)

  const codeEditorView = mock<EditorView>({
    state: mock<EditorState>({
      doc: Text.of(['123']),
    }),
  })

  const currentFile = mock<File>({
    codeEditorView: codeEditorView as any,
    id: '1',
    codeLang: 'typescript',
    path: '/path/to/file.ts',
  })

  Object.defineProperty(fileService, 'currentFile', {get: vi.fn().mockReturnValue(currentFile)})

  let nextId = 3
  vi.spyOn(ThreadService, 'createId').mockImplementation(() => String(nextId++))

  await service.regenerate({id: '1', role: 'user', content: 'message2'})
  await service.insertAutoContext()

  expectTree(
    service.messageTree,
    `
    └ 1 (parentId=, leftId=)
      └ 2 (parentId=1, leftId=)
    └ 3 (parentId=, leftId=1)
      └ 4 (parentId=3, leftId=)
    `,
  )

  expect(service.currentThread?.path?.get(undefined)).toBe('3')
})
