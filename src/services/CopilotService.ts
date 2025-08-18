import {Channel} from '@tauri-apps/api/core'
import {createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {open} from '@/remote/app'
import {
  type CopilotSignIn,
  type CopilotStatus,
  copilotAuthToken,
  copilotSignIn,
  copilotStatus,
  disconnectCopilot,
  sendChatMessage,
  startLanguageServer,
} from '@/remote/copilot'
import {debug, error, info} from '@/remote/log'
import type {ChatRole, State} from '@/state'

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
  messages: ChatMessage[]
}

interface ChatMessageContent {
  type: string
}

export interface ChatMessageImageContent extends ChatMessageContent {
  type: 'image_url'
  image_url: {
    url: string
  }
}

export interface ChatMessageTextContent extends ChatMessageContent {
  type: 'text'
  text: string
}

export interface ChatMessage {
  role: ChatRole
  content: (ChatMessageTextContent | ChatMessageImageContent)[]
}

export interface Model {
  id: string
  name: string
  streaming: boolean
}

export interface Choice {
  message: {content: string}
  delta?: {content: string}
}

export interface Chunk {
  choices: Choice[]
}

const fallbackModel: Model = {id: 'gpt-4o', name: 'gpt-4o', streaming: true}

export class CopilotService {
  private streamingSignal = createSignal(false)

  get chatModel(): Model {
    return this.store.ai?.copilot?.model ?? fallbackModel
  }

  get streaming() {
    return this.streamingSignal[0]
  }

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

  async updateStatus(status: CopilotStatus) {
    info(`Set github status (status=${JSON.stringify(status)})`)
    const copilot = this.store.ai?.copilot
    this.setState('ai', {copilot: {...copilot, ...status}})
    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }

  async getChatModels(): Promise<Model[] | undefined> {
    const accessToken = this.store.ai?.copilot?.accessToken
    if (!accessToken) return
    const tokenResponse = await this.getApiToken(accessToken)
    const url = this.proxy(`${tokenResponse.endpoints.api}/models`)

    debug(`Copilot get models (url=${url}, token=${JSON.stringify(tokenResponse)})`)
    const data = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenResponse.token}`,
        'Editor-Version': this.appVersion(),
        'Copilot-Integration-Id': 'vscode-chat',
      },
    })

    const json = await data.json()

    const models = []
    for (const item of json.data) {
      if (!item.model_picker_enabled) continue
      models.push({
        id: item.id,
        name: item.name,
        streaming: item.capabilities.supports.streaming ?? false,
      })
    }

    return models
  }

  async setChatModel(model: Model) {
    info(`Set chat model (model=${JSON.stringify(model)})`)
    this.setState('ai', 'copilot', 'model', model)
    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }

  async getStatus(code: CopilotSignIn): Promise<CopilotStatus | undefined> {
    if (isTauri()) {
      const status = await copilotStatus()
      const accessToken = await copilotAuthToken()
      return {...status, accessToken}
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
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
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
    messages: ChatMessage[],
    onChunk: (chunk: Chunk) => void,
    onDone: () => void,
    streaming: boolean | undefined = undefined,
  ): Promise<void> {
    if (isTauri()) {
      return new Promise((resolve) => {
        const model = this.chatModel
        const channel = new Channel<string>()
        channel.onmessage = (message: string) => {
          if (message.startsWith('[DONE]')) {
            this.streamingSignal[1](false)
            onDone()
            resolve(undefined)
          } else if (this.streaming()) {
            onChunk(JSON.parse(message))
          }
        }

        this.streamingSignal[1](true)
        return sendChatMessage(model, messages, channel, streaming)
      })
    }

    const model = this.chatModel
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
        Authorization: `Bearer ${tokenResponse.token}`,
        'Editor-Version': this.appVersion(),
        'Copilot-Integration-Id': 'vscode-chat',
        'Copilot-Vision-Request': 'true',
      },
    })

    if (data.status >= 300 || !data.body) {
      const text = await data.text()
      throw new Error(`Failed to connect to API: ${data.status} ${text}`)
    }

    if (streaming ?? model.streaming) {
      await this.getStreamResponse(data, onDone, onChunk)
    } else {
      const json = await data.json()
      onChunk(json)
      onDone()
    }
  }

  stop() {
    this.streamingSignal[1](false)
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
    const reader = data.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    if (!reader) return

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

    this.streamingSignal[1](true)

    const finish = () => {
      this.streamingSignal[1](false)
      onDone()
    }

    while (true) {
      const {value, done} = await reader.read()
      if (done || !this.streaming()) {
        finish()
        break
      }

      buffer += decoder.decode(value, {stream: true})
      const lines = buffer.split('\n\n')

      for (let i = 0; i < lines.length - 1; i++) {
        const data = parseLine(lines[i])
        if (!data) finish()
        else onChunk(data)
      }

      buffer = lines[lines.length - 1]
    }

    if (buffer) {
      const data = parseLine(buffer)
      if (!data) finish()
      else onChunk(data)
    }
  }

  private appVersion(): string {
    return 'TinyWrite/0.8.0'
  }

  private proxy(url: string): string {
    return `https://bitter-sound-ded1.ddietr.workers.dev/?url=${url}`
  }

  private createRequest(
    model: Model,
    messages: ChatMessage[],
    streaming: boolean | undefined = undefined,
  ): CompletionsRequest {
    return {
      intent: true,
      n: 1,
      stream: streaming ?? model.streaming,
      temperature: 0.1,
      model: model.id,
      messages,
    }
  }
}
