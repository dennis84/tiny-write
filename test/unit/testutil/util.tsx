import {render} from '@solidjs/testing-library'
import {mockIPC} from '@tauri-apps/api/mocks'
import {expect, vi} from 'vitest'
import {Main} from '@/components/Main'
import type {Ctrl} from '@/services'
import type {State} from '@/types'

export function expectToBeDefined<T>(value: T | undefined): asserts value is T {
  expect(value).toBeDefined()
}

export const stubLocation = (path: string, state: Record<string, any> = {}) => {
  vi.stubGlobal('location', new URL(`http://localhost:3000${path}`))
  vi.spyOn(window.history, 'state', 'get').mockReturnValue(state)
}

export const renderMain = (state: State) => {
  let ctrl!: Ctrl
  return {
    ...render(() => {
      return <Main state={state} onCtrlReady={(c) => (ctrl = c)} />
    }),
    ctrl,
  }
}

type IpcMockFn = (...args: any[]) => any

export const createIpcMock = (options?: Record<string, IpcMockFn>) => {
  mockIPC((cmd, args: Record<string, any> = {}) => {
    if (options?.[cmd]) {
      return options[cmd](...Object.values(args ?? {}))
    }

    if (cmd === 'get_args') {
      return {}
    }

    if (cmd === 'get_document') {
      return {
        path: args.path,
        worktreePath: undefined,
        language: undefined,
        lastModified: new Date(),
        version: 1,
      }
    }

    if (cmd === 'get_mime_type') {
      const [, ext] = args.path.split('.')
      if (ext === 'md') return `text/markdown`
      if (ext === 'png') return `image/${ext}`
      return `text/${ext}`
    }

    if (cmd === 'dirname') {
      return args.path.substring(0, args.path.lastIndexOf('/'))
    }

    if (cmd === 'resolve_path') {
      return (args.basePath ?? '') + args.path
    }

    if (cmd === 'to_absolute_path') {
      if (args.basePath) return args.path.replace(args.basePath, '.')
      else return args.path.replace('~/', '/users/me/').replace('./', '/users/me/')
    }

    if (cmd === 'to_relative_path') {
      if (args.basePath) return args.path.replace(args.basePath, '.')
      else return args.path.replace('/users/me', '~')
    }

    if (cmd === 'plugin:fs|read_dir') {
      return []
    }

    if (cmd === 'read_text') {
      return 'File1'
    }
  })
}
