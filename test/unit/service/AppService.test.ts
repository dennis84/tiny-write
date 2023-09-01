import {beforeEach, expect, test, vi} from 'vitest'
import {mock, mockDeep} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import {createState, Canvas, Mode} from '@/state'
import {Ctrl} from '@/services'
import {AppService} from '@/services/AppService'

vi.mock('mermaid', () => ({}))
vi.mock('@/db', () => ({DB: mock()}))

beforeEach(() => {
  vi.restoreAllMocks()
})

const createCanvas = (props: Partial<Canvas> = {}): Canvas => ({
  id: 'c1',
  camera: {point: [0, 0], zoom: 1},
  elements: [],
  active: false,
  lastModified: new Date(),
  ...props,
})

const ctrl = mockDeep<Ctrl>()

test('init - new canvas collab', async () => {
  vi.stubGlobal('location', ({pathname: '/c/1'}))
  const initial = createState()
  const [store, setState] = createStore(initial)
  const service = new AppService(ctrl, store, setState)

  const canvas = createCanvas({id: '1'})
  ctrl.canvas.createCanvas.mockReturnValue(canvas)
  ctrl.canvas.activateCanvas.mockImplementation((data) => {
    data.canvases[0].active = true
    return data
  })

  ctrl.collab.create.mockReturnValue({started: true})

  await service.init()

  expect(store.mode).toBe(Mode.Canvas)
  expect(store.collab?.started).toBe(true)
})

test('init - existing canvas collab', async () => {
  vi.stubGlobal('location', ({pathname: '/c/1'}))

  const canvas = createCanvas({id: '1'})
  const initial = createState({
    canvases: [canvas],
  })

  const [store, setState] = createStore(initial)
  const service = new AppService(ctrl, store, setState)

  ctrl.canvas.activateCanvas.mockImplementation((data) => {
    data.canvases[0].active = true
    return data
  })

  ctrl.collab.create.mockReturnValue({started: true})

  await service.init()

  expect(store.mode).toBe(Mode.Canvas)
  expect(store.collab?.started).toBe(true)
  expect(ctrl.canvas.createCanvas).not.toBeCalled()
})
