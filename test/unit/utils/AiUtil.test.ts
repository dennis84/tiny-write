import {expect, test, vi} from 'vitest'
import {AiUtil} from '@/utils/AiUtil'

vi.mock('@/remote/log', () => ({
  error: vi.fn(),
  info: vi.fn(),
}))

const encoder = new TextEncoder()

const makeResponse = (chunks: string[]): Response => {
  let i = 0
  const reader = {
    read: vi.fn(async () => {
      if (i < chunks.length) {
        const value = encoder.encode(chunks[i])
        i++
        return {value, done: false}
      }

      return {value: undefined, done: true}
    }),
    cancel: vi.fn(async () => undefined),
    releaseLock: vi.fn(),
  }

  return {
    body: {
      getReader: () => reader,
    },
  } as unknown as Response
}

test('getStreamResponse parses chunks and completes on [DONE]', async () => {
  const data = makeResponse(['data: {"id":"1"}\n\ndata: [DONE]\n\n'])
  const onChunk = vi.fn()
  const controller = new AbortController()

  const result = await AiUtil.getStreamResponse(data, onChunk, controller.signal)

  expect(result.success).toBe(true)
  expect(onChunk).toHaveBeenCalledTimes(1)
  expect(onChunk).toHaveBeenCalledWith({id: '1'})
})

test('getStreamResponse stops dispatching chunks after [DONE] in same buffer', async () => {
  const data = makeResponse(['data: {"id":"1"}\n\ndata: [DONE]\n\ndata: {"id":"2"}\n\n'])
  const onChunk = vi.fn()
  const controller = new AbortController()

  const result = await AiUtil.getStreamResponse(data, onChunk, controller.signal)

  expect(result.success).toBe(true)
  expect(onChunk).toHaveBeenCalledTimes(1)
  expect(onChunk).toHaveBeenCalledWith({id: '1'})
})

test('getStreamResponse skips a malformed line instead of terminating', async () => {
  const data = makeResponse(['data: not-json\n\ndata: {"id":"1"}\n\ndata: [DONE]\n\n'])
  const onChunk = vi.fn()
  const controller = new AbortController()

  const result = await AiUtil.getStreamResponse(data, onChunk, controller.signal)

  expect(result.success).toBe(true)
  expect(onChunk).toHaveBeenCalledTimes(1)
  expect(onChunk).toHaveBeenCalledWith({id: '1'})
})

test('getStreamResponse resolves with interrupted when the reader rejects due to abort', async () => {
  const controller = new AbortController()
  const reader = {
    read: vi.fn(async () => {
      controller.abort()
      throw new DOMException('The user aborted a request.', 'AbortError')
    }),
    cancel: vi.fn(async () => undefined),
    releaseLock: vi.fn(),
  }
  const data = {body: {getReader: () => reader}} as unknown as Response
  const onChunk = vi.fn()

  const result = await AiUtil.getStreamResponse(data, onChunk, controller.signal)

  expect(result.interrupted).toBe(true)
  expect(result.success).toBe(false)
  expect(onChunk).not.toHaveBeenCalled()
})
