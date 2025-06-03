import fetchMock from 'fetch-mock'
import {pause} from './promise'

const LOREM_IPSUM =
  'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.'
const LOREM_IPSUM_WORDS = LOREM_IPSUM.split(' ')

export class CopilotMock {
  static setup() {
    fetchMock.hardReset()
    const mock = fetchMock.mockGlobal()
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
          while (true) {
            await pause(2000)

            const code = Math.random() > 0.8
            const h1 = Math.random() > 0.8

            if (code) {
              enqueueMessage(controller, '\n\n')
              enqueueMessage(controller, '```')
              await pause(10)
              enqueueMessage(controller, 'typescript\n')
              await pause(10)
            } else if (h1) {
              enqueueMessage(controller, '# ')
            }

            const randomIndex = Math.floor(Math.random() * LOREM_IPSUM_WORDS.length)
            for (let i = 0; i <= randomIndex; i++) {
              enqueueMessage(controller, `${LOREM_IPSUM_WORDS[i]} `)
              await pause(10)
            }

            if (code) {
              enqueueMessage(controller, '\n')
              enqueueMessage(controller, '```')
            }

            enqueueMessage(controller, '\n\n')
          }
        },
      })

    fetchMock
      .mockGlobal()
      .route('end:https://example.com/github/api/chat/completions', createStream)
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
          model_picker_enabled: true,
          capabilities: {supports: {streaming: true}},
        },
        {
          id: 'claude-3.5-sonnet',
          name: 'Claude 3.5 Sonnet',
          model_picker_enabled: true,
          capabilities: {supports: {streaming: true}},
        },
      ],
    }
  }

  static completionsStream(textChunks: string[]) {
    return (
      `${textChunks
        .map((content) => CopilotMock.completions(content))
        .map((json) => CopilotMock.createChunk(json))
        .join('')}data: [DONE]`
    )
  }

  static completions(content: string) {
    return {choices: [{message: {content}}]}
  }

  private static createChunk(chunk: unknown) {
    return `data: ${JSON.stringify(chunk)}\n\n`
  }
}
