import {beforeEach, expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'

vi.mock('@/db', () => ({DB: mock()}))
vi.mock('@/remote/http', () => ({fetch: vi.fn()}))

import {createOpenAICompatible} from '@ai-sdk/openai-compatible'
import {waitFor} from '@solidjs/testing-library'
import type {ModelMessage} from 'ai'
import {createStore} from 'solid-js/store'
import {fetch} from '@/remote/http'
import {AiService} from '@/services/AiService'
import type {CopilotService} from '@/services/CopilotService'
import type {LlamaCppService} from '@/services/LlamaCppService'
import type {OllamaService} from '@/services/OllamaService'
import {createState} from '@/state'
import {FINISH_REASON} from '@/utils/CopilotMock'
import {pause} from '@/utils/promise'

const copilotService = mock<CopilotService>({
  getProvider: vi.fn(),
  models: [],
})
const llamaCppService = mock<LlamaCppService>()
const ollamaService = mock<OllamaService>()

beforeEach(() => {
  copilotService.getProvider.mockResolvedValue(
    createOpenAICompatible({
      name: 'internal-copilot',
      baseURL: 'http://example.com',
      fetch,
    }),
  )

  vi.spyOn(copilotService, 'models', 'get').mockReturnValue([
    {
      id: 'gpt-4o',
      name: 'gpt-4o',
      vendor: 'openai',
      streaming: true,
      maxOutputTokens: 123,
      maxPromptTokens: 123,
      provider: 'copilot',
    },
  ])
})

test('completions - success', async () => {
  const [store, setState] = createStore(
    createState({ai: {copilot: {user: 'johndoe', accessToken: 'ACCESS-TOKEN-123'}}}),
  )
  const service = new AiService(copilotService, ollamaService, llamaCppService, store, setState)

  await waitFor(() => {
    expect(service.models.length).toBe(1)
  })

  const messages: ModelMessage[] = [
    {role: 'user', content: [{type: 'text', text: 'Hello, world!'}]},
  ]

  const chunks = [
    `data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n`,
    `data: {"choices":[{"delta":{"content":", world"}}]}\n\n`,
    `data: ${FINISH_REASON}\n\n`,
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
  const result = await service.completions(messages, (chunk) => {
    content += chunk
  })

  expect(result.success).toBe(true)
  expect(result.interrupted).toBe(undefined)
  expect(content).toEqual('Hello, world')
})

test('completions - interrupted', async () => {
  const [store, setState] = createStore(
    createState({
      ai: {copilot: {user: 'johndoe', accessToken: 'ACCESS-TOKEN-123'}},
    }),
  )
  const service = new AiService(copilotService, ollamaService, llamaCppService, store, setState)

  await waitFor(() => {
    expect(service.models.length).toBe(1)
  })

  const messages: ModelMessage[] = [
    {role: 'user', content: [{type: 'text', text: 'Hello, world!'}]},
  ]

  const chunks = [
    `data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n`,
    `data: {"choices":[{"delta":{"content":", world"}}]}\n\n`,
    `data: {"choices":[{"delta":{"content":", 1"}}]}\n\n`,
    `data: {"choices":[{"delta":{"content":", 2"}}]}\n\n`,
    `data: {"choices":[{"delta":{"content":", 3"}}]}\n\n`,
    `data: ${FINISH_REASON}\n\n`,
    `data: [DONE]\n\n`,
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (const line of chunks) {
        controller.enqueue(encoder.encode(line))
        // Small pause because queued chunks may still be delivered after the stream is interrupted.
        await pause(10)
      }
      controller.close()
    },
  })

  vi.mocked(fetch).mockResolvedValueOnce(new Response(stream, {status: 200}))

  let content = ''
  const result = await service.completions(messages, (chunk) => {
    content += chunk
    // Stop after first chunk
    service.stop()
  })

  expect(result.success).toBe(false)
  expect(result.interrupted).toBe(true)
  expect(content).toEqual('Hello')
})
