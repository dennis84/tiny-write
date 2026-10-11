import fetchMock, {type CallLog} from 'fetch-mock'
import {adjectives, animals, uniqueNamesGenerator} from 'unique-names-generator'
import {v4 as uuid} from 'uuid'
import {pause} from './promise'

const LOREM_IPSUM =
  'Lorem ipsum dolor `[]sit amet`, consetetur `<sadipscing>` elitr, sed [diam](nonumy) eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.'
const LOREM_IPSUM_WORDS = LOREM_IPSUM.split(' ')

export const FINISH_REASON = JSON.stringify({
  choices: [{finish_reason: 'stop', index: 0, delta: {content: null}}],
  created: Date.now(),
  id: uuid(),
  usage: {
    completion_tokens: 8,
    completion_tokens_details: {
      accepted_prediction_tokens: 0,
      rejected_prediction_tokens: 0,
    },
    prompt_tokens: 153,
    prompt_tokens_details: {cached_tokens: 0},
    total_tokens: 161,
  },
  model: 'gpt-4o-2024-11-20',
  system_fingerprint: 'fp_2b2e565915',
  copilot_usage: {
    token_details: [],
    total_nano_aiu: 0,
  },
})

interface Options {
  endlessText?: boolean
  endlessCode?: boolean
}

export class CopilotMock {
  static setup(options: Options = {}) {
    fetchMock.hardReset()
    const mock = fetchMock.spyGlobal()

    mock.route('end:https://github.com/login/device/code', CopilotMock.login())
    mock.route('end:https://github.com/login/oauth/access_token', CopilotMock.accessToken())
    mock.route('end:https://api.github.com/user', CopilotMock.user())
    mock.route('end:https://api.github.com/copilot_internal/v2/token', CopilotMock.apiToken())
    mock.route('end:https://example.com/github/api/models', CopilotMock.models())
    mock.route(
      'begin:https://brave-search-proxy.ddietr.workers.dev/search',
      CopilotMock.braveSearch(),
    )

    const encoder = new TextEncoder()
    const enqueueChunk = (controller: ReadableStreamDefaultController<any>, chunk: unknown) => {
      controller.enqueue(encoder.encode(CopilotMock.toChunk(chunk)))
    }

    const enqueueDelta = (controller: ReadableStreamDefaultController<any>, text: string) => {
      const message = CopilotMock.toChoicesDelta(text)
      enqueueChunk(controller, message)
    }

    const enqueueJsonStringDelta = (
      controller: ReadableStreamDefaultController<any>,
      text: string,
    ) => {
      enqueueDelta(controller, CopilotMock.toJSONString(text))
    }

    const enqueueReasoningDelta = (
      controller: ReadableStreamDefaultController<any>,
      text: string,
    ) => {
      const message = CopilotMock.toReasoningDelta(text)
      enqueueChunk(controller, message)
    }

    const createToolCallStream = (id: string, query: string) =>
      new ReadableStream({
        async start(controller) {
          await pause(2_000)

          enqueueChunk(
            controller,
            CopilotMock.toToolCallDelta(id, 'braveSearch', JSON.stringify({query, count: 5})),
          )

          await pause(1_000)

          enqueueChunk(controller, CopilotMock.toFinishDelta('tool_calls'))
          controller.enqueue(encoder.encode('data: [DONE]'))
          controller.close()
        },
      })

    const countToolResults = (m: CallLog): number => {
      if (typeof m.options.body !== 'string') return 0
      try {
        const json = JSON.parse(m.options.body)
        const messages = Array.isArray(json.messages) ? json.messages : []
        return messages.filter((message: any) => message.role === 'tool').length
      } catch {
        return 0
      }
    }

    const createStream = (m: CallLog) => {
      const toolResultCount = countToolResults(m)

      // Each dummy `braveSearch` tool call is answered in its own
      // chat/completions request/response round-trip (mirroring the real
      // multi-step tool-calling loop), so the pause between the two dummy
      // tool calls is actually visible in the UI instead of both finalizing
      // together at stream end (see StreamingToolCallTracker.flush()).
      if (toolResultCount === 0 && Math.random() > 0.5) {
        return createToolCallStream('call_1', 'latest news about TypeScript')
      }

      if (toolResultCount === 1) {
        return createToolCallStream('call_2', 'TypeScript compiler roadmap updates')
      }

      return new ReadableStream({
        async start(controller) {
          // Simulate a reasoning model "thinking" before it starts streaming
          // the actual answer, mirroring a `reasoning_content` delta stream
          // (see @ai-sdk/openai-compatible's `reasoning-delta` handling).
          const reasoningWordCount = 15 + Math.floor(Math.random() * 26)
          for (let i = 0; i < reasoningWordCount; i++) {
            const randomIndex = Math.floor(Math.random() * LOREM_IPSUM_WORDS.length)
            enqueueReasoningDelta(controller, `${LOREM_IPSUM_WORDS[randomIndex]} `)
            await pause(10)
          }

          await pause(2000)

          enqueueDelta(controller, '{"blocks":[')

          let parts = 0
          while (true) {
            if (!options.endlessText && parts >= 4) {
              enqueueDelta(controller, ']}')
              controller.enqueue(encoder.encode(`data: ${FINISH_REASON}\n\n`))
              controller.enqueue(encoder.encode('data: [DONE]'))
              controller.close()
              break
            }

            parts++
            await pause(2000)

            const code = Math.random() > 0.7
            const h1 = Math.random() > 0.9

            if (code) {
              enqueueDelta(controller, '{"kind":"text","content":"')
              enqueueJsonStringDelta(controller, '\n\n')
              enqueueDelta(controller, '"},')

              enqueueDelta(
                controller,
                '{"kind":"file","lang":"typescript","ref":"123","path":"test.ts","range":[0,0],"content":"',
              )
              enqueueJsonStringDelta(controller, 'let x = ')
              await pause(10)

              if (options.endlessCode) {
                while (true) {
                  const newline = Math.random() > 0.8
                  const randomIndex = Math.floor(Math.random() * LOREM_IPSUM_WORDS.length)
                  enqueueJsonStringDelta(
                    controller,
                    `${JSON.stringify(LOREM_IPSUM_WORDS[randomIndex])}${newline ? '\n' : ' '}`,
                  )
                  await pause(10)
                }
              }

              const randomIndex = Math.floor(Math.random() * LOREM_IPSUM_WORDS.length)
              enqueueJsonStringDelta(controller, JSON.stringify(LOREM_IPSUM_WORDS[randomIndex]))
              enqueueDelta(controller, '"},')
              continue
            }

            enqueueDelta(controller, '{"kind":"text","content":"')
            if (h1) enqueueJsonStringDelta(controller, '# ')

            const randomIndex = Math.floor(Math.random() * LOREM_IPSUM_WORDS.length)
            for (let i = 0; i <= randomIndex; i++) {
              enqueueJsonStringDelta(controller, `${LOREM_IPSUM_WORDS[i]} `)
              await pause(10)
            }

            enqueueJsonStringDelta(controller, '\n\n')
            enqueueDelta(controller, '"},')
          }
        },
      })
    }

    const isCompletions = (m: CallLog, streaming: boolean): boolean => {
      if (!m.url.endsWith('https://example.com/github/api/chat/completions')) return false
      if (typeof m.options.body !== 'string') return false
      const json = JSON.parse(m.options.body)
      if (streaming) return json.stream === true
      return true
    }

    mock.post((m) => isCompletions(m, true), createStream)
    mock.post(
      (m) => isCompletions(m, false),
      () => async () => {
        await pause(2000)
        const title = uniqueNamesGenerator({
          dictionaries: [adjectives, animals],
          style: 'capital',
          separator: ' ',
          length: 2,
        })

        return CopilotMock.toChoicesMessage(title)
      },
    )
  }

  static login() {
    return {
      user_code: 'USER-CODE-123',
      device_code: 'DEVICE-CODE-123',
      verification_uri: 'https://example.com/copilot/verify',
    }
  }

  static accessToken() {
    return {access_token: 'ACCESS-TOKEN-123'}
  }

  static user() {
    return {login: 'johndoe'}
  }

  static apiToken() {
    return {
      token: 'API-TOKEN-123',
      expires_at: 0,
      endpoints: {
        api: 'https://example.com/github/api',
      },
    }
  }

  static braveSearch() {
    return {
      web: {
        results: [
          {
            title: 'TypeScript 5.9 Release Notes',
            url: 'https://example.com/typescript-5-9-release-notes',
            description: 'Overview of the newest TypeScript release.',
          },
          {
            title: "What's new in TypeScript",
            url: 'https://example.com/whats-new-in-typescript',
            description: 'A roundup of recent TypeScript announcements.',
          },
        ],
      },
    }
  }

  static models() {
    return {
      data: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          vendor: 'OpenAI',
          model_picker_enabled: true,
          capabilities: {
            supports: {streaming: true},
            limits: {
              max_context_window_tokens: 400000,
              max_output_tokens: 128000,
              max_prompt_tokens: 272000,
              vision: {
                max_prompt_image_size: 3145728,
                max_prompt_images: 1,
                supported_media_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
              },
            },
          },
        },
        {
          id: 'claude-3.5-sonnet',
          name: 'Claude 3.5 Sonnet',
          vendor: 'Anthropic',
          model_picker_enabled: true,
          capabilities: {
            supports: {streaming: true},
            limits: {
              max_context_window_tokens: 400000,
              max_output_tokens: 128000,
              max_prompt_tokens: 272000,
              vision: {
                max_prompt_image_size: 3145728,
                max_prompt_images: 1,
                supported_media_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
              },
            },
          },
        },
      ],
    }
  }

  static completionsStream(textChunks: string[]) {
    const chunks = [
      '{"blocks":[{"kind":"text","content":"',
      ...textChunks.map((content) => CopilotMock.toJSONString(content)),
      '"}]}',
    ]

    return `${chunks
      .map((content) => CopilotMock.toChunk(CopilotMock.toChoicesDelta(content)))
      .join('')}data: ${FINISH_REASON}\n\ndata: [DONE]`
  }

  static toChoicesDelta(content: string) {
    return {choices: [{delta: {content}}]}
  }

  static toReasoningDelta(content: string) {
    return {choices: [{delta: {reasoning_content: content}}]}
  }

  static toChoicesMessage(content: string) {
    return {choices: [{message: {content}}]}
  }

  static toToolCallDelta(id: string, name: string, argumentsJson: string) {
    return {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id,
                type: 'function',
                function: {
                  name,
                  arguments: argumentsJson,
                },
              },
            ],
          },
        },
      ],
    }
  }

  static toFinishDelta(finishReason: 'stop' | 'tool_calls' = 'stop') {
    return {
      choices: [
        {
          delta: {},
          finish_reason: finishReason,
        },
      ],
    }
  }

  static toChunk(chunk: unknown) {
    return `data: ${JSON.stringify(chunk)}\n\n`
  }

  static toJSONString(content: string) {
    return JSON.stringify(content).slice(1, -1)
  }
}
