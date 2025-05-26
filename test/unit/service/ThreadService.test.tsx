import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import {createState, File, Message} from '@/state'
import {ThreadService} from '@/services/ThreadService'
import {CopilotService} from '@/services/CopilotService'
import {FileService} from '@/services/FileService'
import {createYUpdate} from '../util/codemirror-util'
import {EditorView} from '@codemirror/view'
import {EditorState, Text} from '@codemirror/state'
import {expectTree} from '../util/tree'

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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

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
  expect(store.threads[0].messages[1].streaming).toBeTruthy()
  expect(store.threads[0].messages[1].parentId).toBe('1')

  service.streamLastMessageEnd('2')
  expect(store.threads[0].messages[1].streaming).toBeFalsy()
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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)
  service.messageTree.updateAll(store.threads[0].messages)

  await service.removeMessage(store.threads[0].messages[0])

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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

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
        active: true,
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

  await service.regenerate({id: '1', role: 'user', content: '111'})

  expect(service.messageTree.rootItemIds).toHaveLength(2)

  const {messages} = service.getMessages()
  expect(messages[0].content).toBe('111')
})

test('regenerate - assistant message', async () => {
  const initial = createState({
    threads: [
      {
        id: '1',
        active: true,
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

  expect(service.getMessages().messages).toHaveLength(0)

  await service.regenerate(store.threads[0].messages[1])

  const {messages, nextId} = service.getMessages()
  expect(messages).toHaveLength(1)
  expect(nextId).toBeDefined()
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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)

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
      {id: '2', parentId: '1', role: 'user', content: '', error: 'error'},
    ],
    1,
  ],
  [[{id: '1', role: 'user', content: '```'}], 2],
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
  const fileService = mock<FileService>()
  const service = new ThreadService(store, setState, copilotService, fileService)
  service.messageTree.updateAll(store.threads[0].messages)

  const result = service.getMessages()

  expect(result.messages).toHaveLength(count)
})

test('insertAutoContext', async () => {
  const initial = createState({
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', 'Code'),
        versions: [],
        lastModified,
        active: true,
        code: true,
      },
    ],
    threads: [
      {
        id: '1',
        active: true,
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
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', 'Code'),
        versions: [],
        lastModified,
        active: true,
        code: true,
      },
    ],
    threads: [
      {
        id: '1',
        active: true,
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
    files: [
      {
        id: '1',
        ydoc: createYUpdate('1', 'Code'),
        versions: [],
        lastModified,
        active: true,
        code: true,
      },
    ],
    threads: [
      {
        id: '1',
        active: true,
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

  expect(service.pathMap().get(undefined)).toBe('3')
})
