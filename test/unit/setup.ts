import {vi} from 'vitest'

// render version in menu
vi.stubGlobal('__COMMIT_HASH__', '123')

// handle dark mode
vi.stubGlobal('matchMedia', vi.fn(() => ({
  matchMedia: () => '',
  addEventListener: () => undefined
})))
