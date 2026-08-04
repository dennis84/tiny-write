import {createResource, createSignal, type ResourceReturn} from 'solid-js'
import {produce, type SetStoreFunction, type Store} from 'solid-js/store'
import {DB} from '@/db'
import {info} from '@/remote/log'
import type {State} from '@/types'
import {AiUtil} from '@/utils/AiUtil'
import type {ChatMessage, Chunk, CompletionsResult, Model} from './CopilotService'

export class LlamaCppService {
  private streamingSignal = createSignal<AbortController | undefined>()

  private modelsResource: ResourceReturn<Model[]>

  get baseUrl() {
    return this.store.ai?.llamaCpp?.baseUrl ?? 'http://localhost:8080'
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
  ) {
    this.modelsResource = createResource<Model[]>(() => this.getChatModels())
  }

  async connect() {
    info('Enable llama.cpp AI')
    this.setState(
      produce((state) => {
        state.ai ??= {}
        state.ai.llamaCpp ??= {}
        state.ai.llamaCpp.enabled = true
      }),
    )

    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }

  async disconnect() {
    info('Disable llama.cpp AI')
    this.setState(
      'ai',
      produce((ai = {}) => {
        ai.llamaCpp ??= {}
        ai.llamaCpp.enabled = false
        if (ai.model?.provider === 'llama.cpp') ai.model = undefined
      }),
    )

    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }

  async updateHost(input: string) {
    this.setState('ai', 'llamaCpp', 'baseUrl', input)
    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }

  refetchModels() {
    this.modelsResource[1].refetch()
  }

  async getChatModels(): Promise<Model[]> {
    info('Get llama.cpp chat models')
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`)
      const json = await response.json()

      const models: Model[] = []
      for (const item of json.models) {
        if (item.capabilities.includes('completion')) {
          const name = this.parseName(item.name)
          models.push({
            id: item.name,
            name,
            vendor: this.parseFamily(name),
            streaming: true,
            maxOutputTokens: 40_000,
            maxPromptTokens: 40_000,
            provider: 'llama.cpp',
          })
        }
      }

      return models
    } catch {
      return []
    }
  }

  async completions(
    messages: ChatMessage[],
    onChunk: (chunk: Chunk) => void,
    streaming: boolean | undefined = undefined,
  ): Promise<CompletionsResult> {
    const model = this.store.ai?.model
    if (!model) return {success: false, error: 'No model selected'}
    const controller = new AbortController()

    const url = `${this.baseUrl}/v1/chat/completions`
    const body = JSON.stringify(AiUtil.createRequest(model, messages, streaming))
    const data = await fetch(url, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    this.streamingSignal[1](controller)

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

  private parseName(input: string) {
    const parts = input.split('/')
    if (parts.length === 0) return input
    return parts[parts.length - 1]
  }

  private parseFamily(input: string) {
    if (input.match(/qwen/i)) return 'Qwen'
    return input
  }
}
