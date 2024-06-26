import * as Y from 'yjs'
import {WebsocketProvider} from 'y-websocket'
import {mock} from 'vitest-mock-extended'
import {mockIPC} from '@tauri-apps/api/mocks'
import {UndoManager} from '@/services/CollabService'
import {Collab} from '@/state'

export const createCollabMock = (props: Partial<Collab> = {}): Collab => ({
  started: false,
  rendered: false,
  ydoc: new Y.Doc(),
  provider: mock<WebsocketProvider>(),
  undoManager: mock<UndoManager>(),
  permanentUserData: mock<Y.PermanentUserData>(),
  ...props,
})

export const waitFor = async (fn: () => unknown, retries = 10): Promise<void> => {
  try {
    fn()
  } catch (error) {
    if (retries === 0) {
      console.error(error)
      throw error
    }

    await new Promise((resolve) => setTimeout(resolve, 10))
    return waitFor(fn, retries - 1)
  }
}

export const pause = (ms: number) =>
  new Promise((resolve) => setTimeout(() => resolve(1), ms))

type IpcMockFn = (...args: any[]) => any

export const createIpcMock = (options?: Record<string, IpcMockFn>) => {
  mockIPC((cmd, args: Record<string, any> = {}) => {
    if (options?.[cmd]) {
      return options[cmd](...Object.values(args ?? {}))
    }

    if (cmd === 'get_args') {
      return {}
    }

    if (cmd === 'get_file_last_modified') {
      return new Date()
    }

    if (cmd === 'get_mime_type') {
      const [, ext] = args.path.split('.')
      return ext === 'md' ? `text/${ext}` : `image/${ext}`
    }

    if (cmd === 'dirname') {
      return args.path.substring(0, args.path.lastIndexOf('/'))
    }

    if (cmd === 'resolve_path') {
      return (args.basePath ?? '') + args.path
    }

    if (cmd === 'to_relative_path') {
      if (args.basePath) return args.path.replace(args.basePath, '.')
      else return args.path.replace('/users/me', '~')
    }

    if (cmd === 'plugin:fs|read_text_file') {
      return 'File1'
    }
  })
}
