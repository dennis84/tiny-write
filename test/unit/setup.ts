import {vi} from 'vitest'

// render version in menu
vi.stubGlobal('__COMMIT_HASH__', '123')
vi.stubGlobal('__VERSION__', '1.1.1')

// handle dark mode
vi.stubGlobal(
  'matchMedia',
  vi.fn(() => ({
    matchMedia: () => '',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })),
)

// stubs for solidjs/router
window.scrollTo = vi.fn()

// stubs for PM
Range.prototype.getBoundingClientRect = vi.fn<any>(() => ({
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
}))

Range.prototype.getClientRects = () => ({
  item: vi.fn(),
  length: 0,
  [Symbol.iterator]: vi.fn(),
})
