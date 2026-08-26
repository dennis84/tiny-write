import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'

vi.mock('@/db', () => ({DB: mock()}))

import {waitFor} from '@solidjs/testing-library'
import {createStore} from 'solid-js/store'
import {type ChatMessage, CopilotService} from '@/services/CopilotService'
import {createState} from '@/state'
import {CopilotMock} from '@/utils/CopilotMock'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())

  const tokenBody = JSON.stringify(CopilotMock.apiToken())
  const modelsBody = JSON.stringify(CopilotMock.models())

  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(tokenBody, {status: 200})) // fetch token for models
    .mockResolvedValueOnce(new Response(modelsBody, {status: 200})) // fetch models
    .mockResolvedValueOnce(new Response(tokenBody, {status: 200})) // fetch token for completions
})

test('completions - success', async () => {
  const [store, setState] = createStore(
    createState({ai: {copilot: {accessToken: 'ACCESS-TOKEN-123'}}}),
  )
  const service = new CopilotService(store, setState)

  await waitFor(() => {
    expect(service.models.length).toBe(2)
  })

  const messages: ChatMessage[] = [{role: 'user', content: [{type: 'text', text: 'Hello, world!'}]}]

  const chunks = [
    `data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n`,
    `data: {"choices":[{"delta":{"content":", world"}}]}\n\n`,
    `data: [DONE]\n\n`,
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const line of chunks) {
        controller.enqueue(encoder.encode(line))
      }
      controller.close()
    },
  })

  vi.mocked(fetch).mockResolvedValueOnce(new Response(stream, {status: 200}))

  let content = ''
  const result = await service.completions(
    messages,
    (chunk) => {
      content += chunk.choices.map((c) => c.delta?.content).join('')
    },
    true,
  )

  expect(result.success).toBe(true)
  expect(result.interrupted).toBe(undefined)
  expect(content).toEqual('Hello, world')
})

test('completions - interrupted', async () => {
  const [store, setState] = createStore(
    createState({
      ai: {copilot: {accessToken: 'ACCESS-TOKEN-123'}},
    }),
  )
  const service = new CopilotService(store, setState)

  await waitFor(() => {
    expect(service.models.length).toBe(2)
  })

  const messages: ChatMessage[] = [{role: 'user', content: [{type: 'text', text: 'Hello, world!'}]}]

  const chunks = [
    `data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n`,
    `data: {"choices":[{"delta":{"content":", world"}}]}\n\n`,
    `data: [DONE]\n\n`,
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const line of chunks) {
        controller.enqueue(encoder.encode(line))
      }
      controller.close()
    },
  })

  vi.mocked(fetch).mockResolvedValueOnce(new Response(stream, {status: 200}))

  let content = ''
  const result = await service.completions(
    messages,
    (chunk) => {
      content += chunk.choices.map((c) => c.delta?.content).join('')
      // Stop after first chunk
      service.stop()
    },
    true,
  )

  expect(result.success).toBe(false)
  expect(result.interrupted).toBe(true)
  expect(content).toEqual('Hello')
})
