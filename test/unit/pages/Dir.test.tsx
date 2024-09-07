import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {render, waitFor} from '@solidjs/testing-library'
import {createState} from '@/state'
import {DB} from '@/db'
import {createCtrl} from '@/services'
import {Main} from '@/components/Main'

vi.mock('@/db', () => ({DB: mock<DB>()}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

beforeEach(() => {
  vi.restoreAllMocks()
})

test('dir', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000'))

  const initial = createState({
    args: {
      dir: ['./README.md'],
    },
  })

  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('dir')).toBeDefined()
  })

  expect(getByTestId('link')).toBeDefined()
})

test('dir - empty', async () => {
  vi.stubGlobal('location', new URL('http://localhost:3000'))

  const initial = createState({args: {dir: []}})
  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('editor_scroll')).toBeDefined()
  })
})
