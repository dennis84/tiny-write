import {expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {render, waitFor} from '@solidjs/testing-library'
import {Canvas, createState, Mode} from '@/state'
import {DB} from '@/db'
import {createCtrl} from '@/services'
import {Main} from '@/components/Main'

vi.mock('@/db', () => ({DB: mock<DB>()}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

const createCanvas = (props: Partial<Canvas> = {}): Canvas => ({
  id: '1',
  camera: {point: [0, 0], zoom: 1},
  elements: [],
  active: false,
  lastModified: new Date(),
  ...props,
})

test('share - new', async () => {
  vi.stubGlobal('location', {pathname: '/canvas/1', search: '?share=true&'})

  const initial = createState()
  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  expect(store.mode).toBe(Mode.Canvas)
  expect(store.canvases[0].active).toBe(true)
  expect(store.collab?.started).toBe(true)
})

test('share - existing canvas', async () => {
  vi.stubGlobal('location', {pathname: '/canvas/1', search: '?share=true&'})

  const canvas = createCanvas({id: '1'})
  const initial = createState({
    canvases: [canvas],
  })

  const {store} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  expect(store.mode).toBe(Mode.Canvas)
  expect(store.canvases[0].active).toBe(true)
  expect(store.collab?.started).toBe(true)
})
