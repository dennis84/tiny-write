import {createOpenAICompatible, type OpenAICompatibleProvider} from '@ai-sdk/openai-compatible'
import {createResource, type ResourceReturn} from 'solid-js'
import {produce, type SetStoreFunction, type Store} from 'solid-js/store'
import {DB} from '@/db'
import {info} from '@/remote/log'
import type {Model, State} from '@/types'
import {AiUtil} from '@/utils/AiUtil'

export class LlamaCppService {
  private modelsResource: ResourceReturn<Model[]>

  get baseUrl() {
    return this.store.ai?.llamaCpp?.baseUrl ?? 'http://localhost:8080'
  }

  get models() {
    return this.modelsResource[0].state === 'ready' ? this.modelsResource[0].latest : []
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

  getProvider(): OpenAICompatibleProvider {
    return createOpenAICompatible({
      name: 'llama-cpp',
      baseURL: `${this.baseUrl}/v1`,
      supportsStructuredOutputs: true,
    })
  }

  private async getModels(): Promise<Model[]> {
    if (!this.store.ai?.llamaCpp?.enabled) return []
    return AiUtil.getModels(`${this.baseUrl}/v1/models`, 'llama.cpp', (item) =>
      AiUtil.parseName(item.name),
    )
  }
}
