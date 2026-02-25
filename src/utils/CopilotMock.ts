import fetchMock, {type CallLog} from 'fetch-mock'
import {adjectives, animals, uniqueNamesGenerator} from 'unique-names-generator'
import {pause} from './promise'

const LOREM_IPSUM =
  'Lorem ipsum dolor `[]sit amet`, consetetur `<sadipscing>` elitr, sed [diam](nonumy) eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.'
const LOREM_IPSUM_WORDS = LOREM_IPSUM.split(' ')

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

    const encoder = new TextEncoder()
    const enqueueMessage = (controller: ReadableStreamDefaultController<any>, text: string) => {
      const message = CopilotMock.completions(text)
      const buffer = encoder.encode(CopilotMock.createChunk(message)).buffer
      controller.enqueue(buffer)
    }

    const createStream = () =>
      new ReadableStream({
        async start(controller) {
          let parts = 0
          while (true) {
            if (!options.endlessText && parts >= 4) {
              const buffer = encoder.encode('data: [DONE]').buffer
              controller.enqueue(buffer)
              controller.close()
              break
            }

            parts++
            await pause(2000)

            const code = Math.random() > 0.7
            const h1 = Math.random() > 0.9

            if (code) {
              enqueueMessage(controller, '\n\n')
              enqueueMessage(controller, '```')
              await pause(10)
              enqueueMessage(controller, 'typescript id=123 file=test.ts\n')
              enqueueMessage(controller, 'let x = ') // to test highlighting
              await pause(10)
            } else if (h1) {
              enqueueMessage(controller, '# ')
            }

            if (code && options.endlessCode) {
              while (true) {
                const newline = Math.random() > 0.8
                const randomIndex = Math.floor(Math.random() * LOREM_IPSUM_WORDS.length)
                enqueueMessage(
                  controller,
                  `${LOREM_IPSUM_WORDS[randomIndex]}${newline ? '\n' : ' '}`,
                )
                await pause(10)
              }
            }

            const randomIndex = Math.floor(Math.random() * LOREM_IPSUM_WORDS.length)
            for (let i = 0; i <= randomIndex; i++) {
              enqueueMessage(controller, `${LOREM_IPSUM_WORDS[i]} `)
              await pause(10)
            }

            if (code) {
              enqueueMessage(controller, '\n')
              enqueueMessage(controller, '``') // close code fence in 2 chunks
              enqueueMessage(controller, '`\n\n')
              continue
            }

            enqueueMessage(controller, '\n\n')
          }
        },
      })

    const isCompletions = (m: CallLog, streaming: boolean): boolean => {
      if (!m.url.endsWith('https://example.com/github/api/chat/completions')) return false
      if (typeof m.options.body !== 'string') return false
      const json = JSON.parse(m.options.body)
      return json.stream === streaming
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

        return CopilotMock.completions(title)
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
    return `${textChunks
      .map((content) => CopilotMock.completions(content))
      .map((json) => CopilotMock.createChunk(json))
      .join('')}data: [DONE]`
  }

  static completions(content: string) {
    return {choices: [{message: {content}}]}
  }

  private static createChunk(chunk: unknown) {
    return `data: ${JSON.stringify(chunk)}\n\n`
  }
}
