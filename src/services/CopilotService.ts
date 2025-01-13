import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {Channel} from '@tauri-apps/api/core'
import {DB} from '@/db'
import {Message, State} from '@/state'
import {isTauri} from '@/env'
import {debug, error, info} from '@/remote/log'
import {
  CopilotSignIn,
  copilotSignIn,
  CopilotStatus,
  copilotStatus,
  disconnectCopilot,
  startLanguageServer,
  sendChatMessage,
} from '@/remote/copilot'
import {open} from '@/remote/app'

interface ApiTokenEndpoints {
  api: string
}

interface ApiTokenResponse {
  token: string
  expiresAt: number
  endpoints: ApiTokenEndpoints
}

interface CompletionsRequest {
  intent: boolean
  n: number
  stream: boolean
  temperature: number
  model: string
  messages: Message[]
}

export interface Model {
  name: string
  streaming: boolean
}

export interface Choice {
  message: {content: string}
}

export interface Chunk {
  choices: Choice[]
}

const models: Map<string, Model> = new Map([
  ['gpt-4o', {name: 'gpt-4o-2024-05-13', streaming: true}],
  ['gpt-4', {name: 'gpt-4', streaming: true}],
  ['gpt-3.5-turbo', {name: 'gpt-3.5-turbo', streaming: true}],
  ['o1-preview', {name: 'o1-preview-2024-09-12', streaming: false}],
  ['o1-mini', {name: 'o1-mini-2024-09-12', streaming: false}],
  ['claude-3-5-sonnet', {name: 'claude-3.5-sonnet', streaming: true}],
])

export class CopilotService {
  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  async disconnect() {
    const ai = {...this.store.ai, copilot: undefined}
    this.setState('ai', ai)
    await DB.setAi(ai)
    if (isTauri()) {
      await disconnectCopilot()
    }
  }

  updateStatus(status: CopilotStatus) {
    info(`Set github status (status=${JSON.stringify(status)})`)
    const copilot = this.store.ai?.copilot
    this.setState('ai', {copilot: {...copilot, ...status}})
    const ai = unwrap(this.store.ai)
    if (ai) DB.setAi(ai)
  }

  async getChatModels(): Promise<string[]> {
    return [...models.keys()]
  }

  async setChatModel(model: string) {
    info(`Set chat model (model=${model})`)
    this.setState('ai', 'copilot', 'chatModel', model)
    const ai = unwrap(this.store.ai)
    if (ai) DB.setAi(ai)
  }

  async getStatus(code: CopilotSignIn): Promise<CopilotStatus | undefined> {
    if (isTauri()) {
      return copilotStatus()
    }

    if (!code.deviceCode) {
      return
    }

    const accessToken = await this.getAccessToken(code.deviceCode)
    if (!accessToken) {
      // waiting for authorize in github tab.
      return
    }

    const githubUrl = 'https://api.github.com/user'
    const url = this.proxy(githubUrl)
    const data = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    const json = await data.json()
    const user = json.login

    return {user, accessToken}
  }

  async signIn(): Promise<CopilotSignIn> {
    if (isTauri()) {
      await startLanguageServer()
      return copilotSignIn()
    }

    const githubUrl = 'https://github.com/login/device/code'
    const url = this.proxy(githubUrl)
    const body = new URLSearchParams({
      scope: 'read:user',
      client_id: 'Iv1.b507a08c87ecfe98',
    })
    const data = await fetch(url, {
      method: 'POST',
      body,
      headers: {
        Accept: 'application/json',
      },
    })

    const json = await data.json()

    return {
      userCode: json.user_code,
      deviceCode: json.device_code,
      verificationUri: json.verification_uri,
    }
  }

  async getAccessToken(userCode: string): Promise<string> {
    const githubUrl = 'https://github.com/login/oauth/access_token'
    const url = this.proxy(githubUrl)

    const body = new URLSearchParams({
      client_id: 'Iv1.b507a08c87ecfe98', // copilot ID
      device_code: userCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    })

    const data = await fetch(url, {
      method: 'POST',
      body,
      headers: {
        Accept: 'application/json',
      },
    })

    const json = await data.json()
    return json.access_token
  }

  async getApiToken(accessToken: string): Promise<ApiTokenResponse> {
    const githubUrl = 'https://api.github.com/copilot_internal/v2/token'
    const url = this.proxy(githubUrl)

    const data = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'User-Agent': this.appVersion(),
      },
    })

    const json = await data.json()

    return {
      token: json.token,
      expiresAt: json.expires_at,
      endpoints: json.endpoints,
    }
  }

  async completions(
    messages: Message[],
    onChunk: (chunk: Chunk) => void,
    onDone: () => void,
    streaming: boolean | undefined = undefined,
  ): Promise<void> {
    if (isTauri()) {
      return new Promise((resolve) => {
        const model = this.getModel()
        const channel = new Channel<string>()
        channel.onmessage = (message: string) => {
          if (message.startsWith('[DONE]')) {
            onDone()
            resolve(undefined)
          } else {
            onChunk(JSON.parse(message))
          }
        }

        sendChatMessage(model, messages, channel)
      })
    }

    const model = this.getModel()
    const accessToken = this.store.ai?.copilot?.accessToken
    if (!accessToken) return
    const tokenResponse = await this.getApiToken(accessToken)
    const url = this.proxy(`${tokenResponse.endpoints.api}/chat/completions`)
    const body = JSON.stringify(this.createRequest(model, messages, streaming))

    debug(`Copilot chat - (url=${url}, token=${JSON.stringify(tokenResponse)}, body=${body})`)
    const data = await fetch(url, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenResponse.token}`,
        'Editor-Version': this.appVersion(),
        'Copilot-Integration-Id': 'vscode-chat',
      },
    })

    if (data.status >= 300 || !data.body) {
      const text = await data.text()
      throw new Error(`Failed to connect to API: ${data.status} ${text}`)
    }

    if (streaming ?? model.streaming) {
      this.getStreamResponse(data, onDone, onChunk)
    } else {
      const json = await data.json()
      onChunk(json)
      onDone()
    }
  }

  verify(url: string) {
    if (isTauri()) {
      return open(url)
    }

    window.open(url, '_blank')
  }

  private async getStreamResponse(
    data: Response,
    onDone: () => void,
    onChunk: (chunk: any) => void,
  ) {
    const reader = data.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const parseLine = (s: string) => {
      try {
        const data = s.substring('data: '.length)
        if (data === '[DONE]') return undefined
        else return JSON.parse(data)
      } catch (e) {
        error(`Failed to parse line (s=${s})`, e)
        throw e
      }
    }

    while (true) {
      const {value, done} = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, {stream: true})
      let lines = buffer.split('\n\n')

      for (let i = 0; i < lines.length - 1; i++) {
        const data = parseLine(lines[i])
        if (!data) onDone()
        else onChunk(data)
      }

      buffer = lines[lines.length - 1]
    }

    if (buffer) {
      const data = parseLine(buffer)
      if (!data) onDone()
      else onChunk(data)
    }
  }

  private appVersion(): string {
    return 'TinyWrite/0.8.0'
  }

  private proxy(url: string): string {
    return `https://bitter-sound-ded1.ddietr.workers.dev/?url=${url}`
  }

  private getModel(): Model {
    const modelName = this.store.ai?.copilot?.chatModel ?? 'gpt-4'
    const model = models.get(modelName) ?? models.get('gpt-4')
    return model!
  }

  private createRequest(
    model: Model,
    messages: Message[],
    streaming: boolean | undefined = undefined,
  ): CompletionsRequest {
    return {
      intent: true,
      n: 1,
      stream: streaming ?? model.streaming,
      temperature: 0.1,
      model: model.name,
      messages,
    }
  }
}
