import {createOpenAICompatible, type OpenAICompatibleProvider} from '@ai-sdk/openai-compatible'
import {createResource, type ResourceReturn} from 'solid-js'
import {produce, type SetStoreFunction, type Store} from 'solid-js/store'
import {DB} from '@/db'
import {info} from '@/remote/log'
import type {Model, State} from '@/types'
import {AiUtil} from '@/utils/AiUtil'

export class OllamaService {
  private modelsResource: ResourceReturn<Model[]>

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

  getProvider(): OpenAICompatibleProvider {
    return createOpenAICompatible({
      name: 'ollama',
      baseURL: 'http://localhost:11434/v1',
      apiKey: 'ollama',
      supportsStructuredOutputs: true,
    })
  }

  private async getModels(): Promise<Model[]> {
    if (!this.store.ai?.ollama?.enabled) return []
    return AiUtil.getModels(
      'http://localhost:11434/api/tags',
      'ollama',
      (item) => item.details.family,
    )
  }
}
