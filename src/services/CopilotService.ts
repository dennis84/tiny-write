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
import {lspRegisterDocument} from '@/remote/lsp'
import type {ChatRole, State} from '@/types'
import type {FileService} from './FileService'

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
  vendor: string
  streaming: boolean
  maxOutputTokens: number
  maxPromptTokens: number
}

export interface Choice {
  message: {content: string}
  delta?: {content: string}
}

export interface Chunk {
  choices: Choice[]
}

interface CompletionsResult {
  success: boolean
  interrupted?: boolean
  error?: string
}

const fallbackModel: Model = {
  id: 'gpt-4o',
  name: 'gpt-4o',
  vendor: 'OpenAI',
  streaming: true,
  maxOutputTokens: 40_000,
  maxPromptTokens: 40_000,
}

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
    private fileService: FileService,
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

    if (isTauri()) {
      await startLanguageServer()
      const currentFile = this.fileService.currentFile
      // Register file to LSP server
      if (currentFile?.path) {
        await lspRegisterDocument(currentFile.path)
      }
    }
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

      if (
        // models like gpt-4o don't have supported_endpoints field but they do support /chat/completions endpoint
        item.supported_endpoints === undefined ||
        item.supported_endpoints.includes('/chat/completions')
      ) {
        models.push({
          id: item.id,
          name: item.name,
          vendor: item.vendor,
          streaming: item.capabilities.supports.streaming ?? false,
          maxOutputTokens: item.capabilities.limits.max_output_tokens ?? 40_000,
          maxPromptTokens: item.capabilities.limits.max_prompt_tokens ?? 40_000,
        })
      }
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
    streaming: boolean | undefined = undefined,
  ): Promise<CompletionsResult> {
    if (isTauri()) {
      return new Promise((resolve) => {
        const model = this.chatModel
        const channel = new Channel<string>()
        channel.onmessage = (message: string) => {
          if (message.startsWith('[DONE]')) {
            this.streamingSignal[1](false)
            resolve({success: true})
          } else if (this.streaming()) {
            onChunk(JSON.parse(message))
          } else {
            resolve({success: false, interrupted: true})
          }
        }

        this.streamingSignal[1](true)
        return sendChatMessage(model, messages, channel, streaming)
      })
    }

    const model = this.chatModel
    const accessToken = this.store.ai?.copilot?.accessToken
    if (!accessToken) return {success: false, error: 'No access token'}

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
      const error = await data.text()
      return {
        success: false,
        interrupted: false,
        error,
      }
    }

    if (streaming ?? model.streaming) {
      return await this.getStreamResponse(data, onChunk)
    } else {
      const json = await data.json()
      onChunk(json)
      return {success: true}
    }
  }

  async completionsSync(messages: ChatMessage[]): Promise<string | undefined> {
    let answer = ''
    const result = await this.completions(
      messages,
      (chunk) => {
        for (const choice of chunk.choices) {
          const content = choice.delta?.content ?? choice.message?.content ?? ''
          answer += content
        }
      },
      false,
    )

    if (result.success) return answer
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
    onChunk: (chunk: Chunk) => void,
  ): Promise<CompletionsResult> {
    const result: CompletionsResult = {success: false}
    const reader = data.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    if (!reader) return result

    const parseLine = (s: string): Chunk | undefined => {
      try {
        const data = s.substring('data: '.length)
        if (data.startsWith('[DONE]'))
          return undefined // can end with \n
        else return JSON.parse(data)
      } catch (e) {
        error(`Failed to parse line (s=${s})`, e)
        return undefined
      }
    }

    this.streamingSignal[1](true)
    let finished = false

    const finish = (inLoop = false) => {
      if (finished) return
      finished = true

      info(`Finishing stream response (inLoop=${inLoop}, streaming=${this.streaming()})`)
      if (inLoop && !this.streaming()) {
        result.interrupted = true
      } else {
        this.streamingSignal[1](false)
        result.success = true
      }
    }

    while (!finished) {
      const {value, done} = await reader.read()
      if (done || !this.streaming()) {
        finish(true)
        break
      }

      buffer += decoder.decode(value, {stream: true})
      const lines = buffer.split('\n\n')

      for (let i = 0; i < lines.length - 1; i++) {
        const data = parseLine(lines[i])
        if (!data) {
          finish(true)
        } else {
          onChunk(data)
        }
      }

      buffer = lines[lines.length - 1]
    }

    if (buffer) {
      const data = parseLine(buffer)
      if (!data) finish()
      else onChunk(data)
    }

    return result
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
      intent: true, // Enables intent detection/classification for the request
      n: 1, // Number of response completions to generate
      stream: streaming ?? model.streaming, // Whether to stream the response; uses provided value or falls back to model's default
      temperature: 0.1, // Controls randomness (0-2); low value = more focused/deterministic responses
      model: model.id, // Identifier of the AI model to use
      messages, // Array of conversation messages (user/assistant history)
    }
  }
}
