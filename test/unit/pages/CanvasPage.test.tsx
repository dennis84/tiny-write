import {render, waitFor} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {Main} from '@/components/Main'
import type {DB} from '@/db'
import {createCtrl} from '@/services'
import {type Canvas, createState, Page} from '@/state'

vi.mock('@/db', () => ({DB: mock<DB>()}))

const WsMock = vi.fn()
vi.stubGlobal('WebSocket', WsMock)

const createCanvas = (props: Partial<Canvas> = {}): Canvas => ({
  id: '1',
  camera: {point: [0, 0], zoom: 1},
  elements: [],
  lastModified: new Date(),
  ...props,
})

test('share - new', async () => {
  vi.stubGlobal('location', {pathname: '/canvas/1', search: '?share=true&'})

  const initial = createState()
  const {store, canvasService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  expect(store.location?.page).toBe(Page.Canvas)
  expect(canvasService.currentCanvasId).toBe('1')
  expect(store.collab?.started).toBe(true)
})

test('share - existing canvas', async () => {
  vi.stubGlobal('location', {pathname: '/canvas/1', search: '?share=true&'})

  const canvas = createCanvas({id: '1'})
  const initial = createState({
    canvases: [canvas],
  })

  const {store, canvasService} = createCtrl(initial)
  const {getByTestId} = render(() => <Main state={store} />)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  expect(store.location?.page).toBe(Page.Canvas)
  expect(canvasService.currentCanvasId).toBe('1')
  expect(store.collab?.started).toBe(true)
})
