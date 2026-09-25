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
import type {ToolCall} from '@/types'
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

test('completions - onToolCall reports tool-call and tool-result events', async () => {
  const [store, setState] = createStore(
    createState({ai: {copilot: {user: 'johndoe', accessToken: 'ACCESS-TOKEN-123'}}}),
  )
  const service = new AiService(copilotService, ollamaService, llamaCppService, store, setState)

  await waitFor(() => {
    expect(service.models.length).toBe(1)
  })

  const messages: ModelMessage[] = [
    {role: 'user', content: [{type: 'text', text: 'Search for something'}]},
  ]

  const toolCallChunks = [
    `data: ${JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call_1',
                type: 'function',
                function: {name: 'braveSearch', arguments: ''},
              },
            ],
          },
        },
      ],
    })}\n\n`,
    `data: ${JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                function: {arguments: JSON.stringify({query: 'latest TypeScript news', count: 5})},
              },
            ],
          },
        },
      ],
    })}\n\n`,
    `data: ${JSON.stringify({choices: [{delta: {}, finish_reason: 'tool_calls'}]})}\n\n`,
    `data: [DONE]\n\n`,
  ]

  const finalChunks = [
    `data: {"choices":[{"delta":{"content":"Done"}}]}\n\n`,
    `data: ${FINISH_REASON}\n\n`,
    `data: [DONE]\n\n`,
  ]

  const encoder = new TextEncoder()
  const toStream = (chunks: string[]) =>
    new ReadableStream({
      async start(controller) {
        for (const line of chunks) {
          controller.enqueue(encoder.encode(line))
          await pause(10)
        }
        controller.close()
      },
    })

  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(toStream(toolCallChunks), {status: 200}))
    .mockResolvedValueOnce(new Response(toStream(finalChunks), {status: 200}))

  const originalFetch = globalThis.fetch
  globalThis.fetch = vi.fn().mockImplementation(async () => {
    await pause(30)
    return new Response(
      JSON.stringify({
        web: {
          results: [
            {title: 'TypeScript 5.9 released', url: 'https://example.com/ts-5-9', description: ''},
          ],
        },
      }),
      {status: 200},
    )
  }) as any

  try {
    const toolCallEvents: ToolCall[] = []
    const completionsPromise = service.completions(
      messages,
      () => {},
      (toolCall) => {
        toolCallEvents.push(toolCall)
      },
    )

    await waitFor(() => {
      const call = toolCallEvents.find(
        (it) => it.toolName === 'braveSearch' && it.status === 'tool-call',
      )
      expect(call?.input?.query).toEqual('latest TypeScript news')
    })

    const result = await completionsPromise

    await waitFor(() => {
      const resultEvent = toolCallEvents.find(
        (it) => it.toolName === 'braveSearch' && it.status === 'tool-result',
      )
      expect(resultEvent).toBeDefined()
      expect(resultEvent?.result).toEqual([
        {title: 'TypeScript 5.9 released', url: 'https://example.com/ts-5-9', description: ''},
      ])
    })

    expect(result.success).toBe(true)
  } finally {
    globalThis.fetch = originalFetch
  }
})
