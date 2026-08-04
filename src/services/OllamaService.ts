import {createResource, createSignal} from 'solid-js'
import {produce, type SetStoreFunction, type Store} from 'solid-js/store'
import {DB} from '@/db'
import {info} from '@/remote/log'
import type {State} from '@/types'
import {AiUtil} from '@/utils/AiUtil'
import type {ChatMessage, Chunk, CompletionsResult, Model} from './CopilotService'

export class OllamaService {
  private streamingSignal = createSignal<AbortController | undefined>()

  private modelsResource = createResource<Model[]>(() => this.getChatModels())

  get streaming() {
    return this.streamingSignal[0]
  }

  get models() {
    return this.modelsResource[0].latest ?? []
  }

  constructor(
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  async connect() {
    info('Enable ollama AI')
    this.setState(
      produce((state) => {
        state.ai ??= {}
        state.ai.ollama ??= {}
        state.ai.ollama.enabled = true
      }),
    )

    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }

  async disconnect() {
    info('Disable ollama AI')
    this.setState(
      'ai',
      produce((ai = {}) => {
        ai.ollama ??= {}
        ai.ollama.enabled = false
        if (ai.model?.provider === 'ollama') ai.model = undefined
      }),
    )

    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }

  async getChatModels(): Promise<Model[]> {
    info('Get ollama chat models')
    try {
      const response = await fetch('http://localhost:11434/api/tags')
      const json = await response.json()

      const models: Model[] = []
      for (const item of json.models) {
        if (item.capabilities.includes('completion')) {
          const family = this.parseFamily(item.details.family)
          models.push({
            id: item.name,
            name: item.name,
            vendor: family,
            streaming: true,
            maxOutputTokens: 40_000,
            maxPromptTokens: 40_000,
            provider: 'ollama',
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

    const url = 'http://localhost:11434/v1/chat/completions'
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

  private parseFamily(input: string) {
    if (input.startsWith('qwen')) return 'Qwen'
    return input
  }
}
