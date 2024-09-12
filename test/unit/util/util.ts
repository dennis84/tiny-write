import * as Y from 'yjs'
import {WebsocketProvider} from 'y-websocket'
import {YMultiDocUndoManager} from 'y-utility/y-multidoc-undomanager'
import {mock} from 'vitest-mock-extended'
import {mockIPC} from '@tauri-apps/api/mocks'
import {Collab} from '@/state'

export const createCollabMock = (props: Partial<Collab> = {}): Collab => ({
  id: '1',
  started: false,
  ydoc: new Y.Doc(),
  provider: mock<WebsocketProvider>(),
  providers: {},
  undoManager: mock<YMultiDocUndoManager>(),
  permanentUserData: mock<Y.PermanentUserData>(),
  ...props,
})

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
