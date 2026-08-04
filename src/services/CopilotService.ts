import {Channel} from '@tauri-apps/api/core'
import {createResource, createSignal, type ResourceReturn} from 'solid-js'
import {produce, type SetStoreFunction, type Store} from 'solid-js/store'
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
import {debug, info} from '@/remote/log'
import {lspRegisterDocument} from '@/remote/lsp'
import type {AiProvider, ChatRole, State} from '@/types'
import {AiUtil} from '@/utils/AiUtil'
import type {FileService} from './FileService'

interface ApiTokenEndpoints {
  api: string
}

interface ApiTokenResponse {
  token: string
  expiresAt: number
  endpoints: ApiTokenEndpoints
}

export interface CompletionsRequest {
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
  provider: AiProvider
}

export interface Choice {
  message: {content: string}
  delta?: {content: string}
}

export interface Chunk {
  choices: Choice[]
}

export interface CompletionsResult {
  success: boolean
  interrupted?: boolean
  error?: string
}

export class CopilotService {
  private streamingSignal = createSignal<AbortController | undefined>()

  private modelsResource: ResourceReturn<Model[]>

  get fallbackModel(): Model | undefined {
    return this.store.ai?.copilot?.user
      ? {
          id: 'gpt-4o',
          name: 'gpt-4o',
          vendor: 'OpenAI',
          streaming: true,
          maxOutputTokens: 40_000,
          maxPromptTokens: 40_000,
          provider: 'copilot',
        }
      : undefined
  }

  get chatModel(): Model | undefined {
    return this.store.ai?.model ?? this.modelsResource[0].latest?.find((it) => it.id === 'gpt-4o')
  }

  get streaming() {
    return this.streamingSignal[0]
  }

  get models() {
    return this.modelsResource[0].latest ?? []
  }

  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
    private fileService: FileService,
  ) {
    this.modelsResource = createResource(() => this.getChatModels())
  }

  async disconnect() {
    this.setState(
      'ai',
      produce((ai = {}) => {
        ai.copilot = undefined
        if (ai.model?.provider === 'copilot') ai.model = undefined
      }),
    )

    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
    if (isTauri()) {
      await disconnectCopilot()
    }
  }

  async updateStatus(status: CopilotStatus) {
    info(`Set github status (status=${JSON.stringify(status)})`)
    this.setState(
      produce((state) => {
        state.ai ??= {}
        state.ai.copilot ??= {}
        state.ai.copilot.accessToken = status.accessToken
        state.ai.copilot.user = status.user
      }),
    )

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

  async getChatModels(): Promise<Model[]> {
    const accessToken = this.store.ai?.copilot?.accessToken
    if (!accessToken) return []
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

    const models: Model[] = []
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
          provider: 'copilot',
        })
      }
    }

    return models
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
    const model = this.chatModel
    if (!model) return {success: false, error: 'No model selected'}

    if (isTauri()) {
      return new Promise((resolve) => {
        const channel = new Channel<string>()
        channel.onmessage = (message: string) => {
          if (message.startsWith('[DONE]')) {
            this.streamingSignal[1](new AbortController())
            resolve({success: true})
          } else if (this.streaming()) {
            onChunk(JSON.parse(message))
          } else {
            resolve({success: false, interrupted: true})
          }
        }

        this.streamingSignal[1](undefined)
        return sendChatMessage(model, messages, channel, streaming)
      })
    }

    const accessToken = this.store.ai?.copilot?.accessToken
    if (!accessToken) return {success: false, error: 'No access token'}

    const tokenResponse = await this.getApiToken(accessToken)
    const url = this.proxy(`${tokenResponse.endpoints.api}/chat/completions`)
    const body = JSON.stringify(AiUtil.createRequest(model, messages, streaming))

    debug(`Copilot chat - (url=${url}, token=${JSON.stringify(tokenResponse)}, body=${body})`)

    const controller = new AbortController()
    this.streamingSignal[1](controller)

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
      signal: controller.signal,
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
      return await AiUtil.getStreamResponse(data, onChunk, controller.signal)
    } else {
      const json = await data.json()
      onChunk(json)
      return {success: true}
    }
  }

  stop() {
    this.streamingSignal[0]()?.abort()
    this.streamingSignal[1](undefined)
  }

  verify(url: string) {
    if (isTauri()) {
      return open(url)
    }

    window.open(url, '_blank')
  }

  private appVersion(): string {
    return 'TinyWrite/0.8.0'
  }

  private proxy(url: string): string {
    return `https://bitter-sound-ded1.ddietr.workers.dev/?url=${url}`
  }
}
