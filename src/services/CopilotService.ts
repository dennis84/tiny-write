import {createOpenAICompatible, type OpenAICompatibleProvider} from '@ai-sdk/openai-compatible'
import {createResource, type ResourceReturn} from 'solid-js'
import {produce, type SetStoreFunction, type Store} from 'solid-js/store'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {open} from '@/remote/app'
import {
  type CopilotPromptUserDeviceFlow,
  type CopilotSignIn,
  type CopilotStatus,
  copilotAuthToken,
  copilotSignIn,
  copilotStatus,
  disconnectCopilot,
  startLanguageServer,
} from '@/remote/copilot'
import {fetch} from '@/remote/http'
import {debug, info} from '@/remote/log'
import type {Copilot, Model, State} from '@/types'

interface ApiTokenEndpoints {
  api: string
}

interface ApiTokenResponse {
  token: string
  expiresAt: number
  endpoints: ApiTokenEndpoints
}

export class CopilotService {
  private modelsResource: ResourceReturn<Model[]>

  get chatModel(): Model | undefined {
    return this.store.ai?.model ?? this.modelsResource[0].latest?.find((it) => it.id === 'gpt-4o')
  }

  get models() {
    return this.modelsResource[0].state === 'ready' ? this.modelsResource[0].latest : []
  }

  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {
    this.modelsResource = createResource(() => this.getModels())
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

  async updateConfig(config: Copilot) {
    info(`Update copilot config (config=${JSON.stringify(config)})`)
    this.setState(
      produce((state) => {
        state.ai ??= {}
        state.ai.copilot ??= {}
        state.ai.copilot.accessToken = config.accessToken
        state.ai.copilot.user = config.user
        state.ai.copilot.lspEnabled = config.lspEnabled
      }),
    )

    const ai = this.store.ai
    if (ai) await DB.setAi(ai)

    if (isTauri()) {
      await startLanguageServer()
    }
  }

  async getStatus(code: CopilotPromptUserDeviceFlow): Promise<CopilotStatus | undefined> {
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
      status: json.status,
      user: json.user,
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

  verify(url: string) {
    if (isTauri()) {
      return open(url)
    }

    window.open(url, '_blank')
  }

  async getProvider(): Promise<OpenAICompatibleProvider | undefined> {
    const accessToken = this.store.ai?.copilot?.accessToken
    if (!accessToken) return

    const tokenResponse = await this.getApiToken(accessToken)
    const baseURL = this.proxy(tokenResponse.endpoints.api)

    return createOpenAICompatible({
      name: 'internal-copilot',
      baseURL,
      apiKey: tokenResponse.token,
      supportsStructuredOutputs: true,
      headers: {
        'Editor-Version': this.appVersion(),
        'Copilot-Integration-Id': 'vscode-chat',
        'Copilot-Vision-Request': 'true',
      },
    })
  }

  private async getModels(): Promise<Model[]> {
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

  private appVersion(): string {
    return 'TinyWrite/0.8.0'
  }

  private proxy(url: string): string {
    return `https://bitter-sound-ded1.ddietr.workers.dev/?url=${url}`
  }
}
