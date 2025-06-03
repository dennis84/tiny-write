import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {render, waitFor} from '@solidjs/testing-library'
import {createState} from '@/state'
import type {DB} from '@/db'
import {createCtrl} from '@/services'
import {Main} from '@/components/Main'
import {createIpcMock, stubLocation} from '../util/util'
import {mockWindows} from '@tauri-apps/api/mocks'

vi.mock('@/db', () => ({DB: mock<DB>()}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

beforeEach(() => {
  vi.restoreAllMocks()
})

test('dir', async () => {
  stubLocation('/')
  vi.stubGlobal('__TAURI__', {})
  mockWindows('main')
  createIpcMock({
    'plugin:fs|read_dir': async () => [{name: 'README.md'}],
    get_args: () => ({cwd: '/users/me/project', source: './'}),
  })

  const initial = createState()
  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('dir')).toBeDefined()
    expect(getByTestId('link')).toBeDefined()
  })
})

test('dir - empty', async () => {
  stubLocation('/')
  vi.stubGlobal('__TAURI__', {})
  mockWindows('main')
  createIpcMock({
    'plugin:fs|read_dir': async () => [],
    get_args: () => ({cwd: '/users/me/project', source: './'}),
  })

  const initial = createState()
  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('dir')).toBeDefined()
  })
})

test('dir - file args', async () => {
  stubLocation('/')
  vi.stubGlobal('__TAURI__', {})
  mockWindows('main')
  createIpcMock({
    get_args: () => ({cwd: '/users/me/project', source: 'file1.md', file: 'file1.md'}),
  })

  const initial = createState()
  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })
})

test.each([
  {name: 'file2.md', code: false, expectContainer: 'editor_scroll'},
  {name: 'file2.rs', code: true, expectContainer: 'code_scroll'},
])('dir - open', async ({name, code, expectContainer}) => {
  stubLocation('/')
  vi.stubGlobal('__TAURI__', {})
  mockWindows('main')
  createIpcMock({
    'plugin:fs|read_dir': async () => [{name}],
    get_args: () => ({cwd: '/users/me/project/', source: './'}),
  })

  const initial = createState()

  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('dir')).toBeDefined()
    expect(getByTestId('link')).toBeDefined()
  })

  getByTestId('link').click()

  await waitFor(() => {
    expect(getByTestId(expectContainer)).toBeDefined()
  })

  expect(store.files[0].path).toBe(`/users/me/project/${name}`)
  expect(store.files[0].code).toBe(code)
})
