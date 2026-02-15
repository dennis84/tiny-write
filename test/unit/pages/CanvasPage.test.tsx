import {waitFor} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import type {DB} from '@/db'
import {createState} from '@/state'
import {type Canvas, Page} from '@/types'
import {renderMain, stubLocation} from '../testutil/util'

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

test('share - new canvas page', async () => {
  stubLocation('/canvas')

  const initial = createState()
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('new_canvas_page')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Canvas)
  expect(ctrl.canvasService.currentCanvasId).toBe(undefined)
})

test('share - not found', async () => {
  stubLocation('/canvas/1')

  const initial = createState()
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('new_canvas_page')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Canvas)
  expect(ctrl.canvasService.currentCanvasId).toBe(undefined)
})

test('share - existing canvas', async () => {
  stubLocation('/canvas/1')

  const canvas = createCanvas({id: '1'})
  const initial = createState({
    canvases: [canvas],
  })

  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Canvas)
  expect(ctrl.canvasService.currentCanvasId).toBe('1')
})

test('share - join', async () => {
  stubLocation('/canvas?join=1')

  const initial = createState()
  const {getByTestId, ctrl} = renderMain(initial)

  await waitFor(() => {
    expect(getByTestId('new_canvas_page')).toBeDefined()
  })

  getByTestId('join_canvas').click()

  await waitFor(() => {
    expect(getByTestId('canvas_container')).toBeDefined()
  })

  expect(ctrl.locationService.page).toBe(Page.Canvas)
  expect(ctrl.canvasService.currentCanvasId).toBe('1')
  expect(ctrl.collabService.started()).toBe(true)
})
