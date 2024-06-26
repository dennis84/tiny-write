import {beforeEach, expect, test, vi} from 'vitest'
import {mock, mockDeep} from 'vitest-mock-extended'
import {createStore} from 'solid-js/store'
import {createState, Canvas, Mode} from '@/state'
import {Ctrl} from '@/services'
import {AppService} from '@/services/AppService'
import {CanvasService} from '@/services/CanvasService'
import {CollabService} from '@/services/CollabService'
import {createCollabMock} from '../util/util'

vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => ''
})))

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
  vi.stubGlobal('location', ({pathname: '/canvas/1'}))
  const initial = createState()
  const [store, setState] = createStore(initial)
  const service = new AppService(ctrl, store, setState)

  const canvas = createCanvas({id: '1'})
  vi.spyOn(CanvasService, 'createCanvas').mockReturnValue(canvas)
  vi.spyOn(CollabService, 'create').mockReturnValue(createCollabMock({started: true}))

  await service.init()

  expect(store.mode).toBe(Mode.Canvas)
  expect(store.canvases[0].active).toBe(true)
  expect(store.collab?.started).toBe(true)
})

test('init - existing canvas collab', async () => {
  vi.stubGlobal('location', ({pathname: '/canvas/1'}))

  const canvas = createCanvas({id: '1'})
  const initial = createState({
    canvases: [canvas],
  })

  const [store, setState] = createStore(initial)
  const service = new AppService(ctrl, store, setState)

  vi.spyOn(CollabService, 'create').mockReturnValue(createCollabMock({started: true}))

  await service.init()

  expect(store.mode).toBe(Mode.Canvas)
  expect(store.collab?.started).toBe(true)
  expect(store.canvases[0].active).toBe(true)
})
