import {getArgs} from '../../index'

jest.mock('electron', () => ({
  app: {
    getName: jest.fn(),
    getVersion: jest.fn(),
    requestSingleInstanceLock: jest.fn(),
    quit: jest.fn(),
  },
  ipcMain: {
    handle: jest.fn(),
  },
}))

it.each(['dev', 'test'])('getArgs - empty', (env) => {
  const argv = ['']
  process.env.NODE_ENV = env
  const args = getArgs(argv)
  expect(args.file).toBe(undefined)
  expect(args.room).toBe(undefined)
})

it('getArgs - deep link', () => {
  process.env.NODE_ENV = 'test'
  const text = Buffer.from('blah').toString('base64')
  const argv = ['', `tinywrite://main?room=123&text=${text}`]
  const args = getArgs(argv)
  expect(args.room).toBe('123')
  expect(args.text).toBe('blah')
})

it('getArgs - deep link - dev', () => {
  process.env.NODE_ENV = 'dev'
  const text = Buffer.from('blah').toString('base64')
  const argv = ['', '', `tinywrite://main?room=123&text=${text}`]
  const args = getArgs(argv)
  expect(args.room).toBe('123')
  expect(args.text).toBe('blah')
})

it('getArgs - file', () => {
  process.env.NODE_ENV = 'test'
  const argv = ['', './README.md']
  const args = getArgs(argv)
  expect(args.room).toBe(undefined)
  expect(args.file).toContain('/README.md')
})

it('getArgs - deep link - dev', () => {
  process.env.NODE_ENV = 'dev'
  const argv = ['', '', './README.md']
  const args = getArgs(argv)
  expect(args.room).toBe(undefined)
  expect(args.file).toContain('/README.md')
})

it('getArgs - file and deep link', () => {
  process.env.NODE_ENV = 'test'
  const argv = ['', './README.md', 'tinywrite://main?room=123']
  const args = getArgs(argv)
  expect(args.room).toBe('123')
  expect(args.file).toContain('/README.md')
})
