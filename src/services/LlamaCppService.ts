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
    this.modelsResource = createResource<Model[]>(() => this.getModels())
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

  async completions(
    messages: ChatMessage[],
    onChunk: (chunk: Chunk) => void,
    streaming: boolean | undefined = undefined,
  ): Promise<CompletionsResult> {
    const model = this.store.ai?.model
    if (!model) return {success: false, error: 'No model selected'}
    const controller = new AbortController()
    this.streamingSignal[1](controller)

    const url = `${this.baseUrl}/v1/chat/completions`
    try {
      return await AiUtil.completions(url, model, messages, onChunk, controller, streaming)
    } finally {
      this.streamingSignal[1](undefined)
    }
  }

  stop() {
    this.streamingSignal[0]()?.abort()
    this.streamingSignal[1](undefined)
  }

  private async getModels(): Promise<Model[]> {
    if (!this.store.ai?.llamaCpp?.enabled) return []
    return AiUtil.getModels(`${this.baseUrl}/v1/models`, 'llama.cpp', (item) =>
      AiUtil.parseName(item.name),
    )
  }
}
