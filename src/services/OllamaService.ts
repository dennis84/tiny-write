import {createResource, createSignal} from 'solid-js'
import {produce, type SetStoreFunction, type Store} from 'solid-js/store'
import {DB} from '@/db'
import {info} from '@/remote/log'
import type {State} from '@/types'
import {AiUtil} from '@/utils/AiUtil'
import type {ChatMessage, Chunk, CompletionsResult, Model} from './CopilotService'

export class OllamaService {
  private streamingSignal = createSignal<AbortController | undefined>()

  private modelsResource = createResource<Model[]>(() => this.getModels())

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

  async completions(
    messages: ChatMessage[],
    onChunk: (chunk: Chunk) => void,
    streaming: boolean | undefined = undefined,
  ): Promise<CompletionsResult> {
    const model = this.store.ai?.model
    if (!model) return {success: false, error: 'No model selected'}
    const controller = new AbortController()
    this.streamingSignal[1](controller)

    const url = 'http://localhost:11434/v1/chat/completions'
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
    if (!this.store.ai?.ollama?.enabled) return []
    return AiUtil.getModels(
      'http://localhost:11434/api/tags',
      'ollama',
      (item) => item.details.family,
    )
  }
}
