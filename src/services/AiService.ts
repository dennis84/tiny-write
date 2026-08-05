import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {info} from '@/remote/log'
import type {State} from '@/types'
import type {ChatMessage, Chunk, CompletionsResult, CopilotService, Model} from './CopilotService'
import type {LlamaCppService} from './LlamaCppService'
import type {OllamaService} from './OllamaService'

export class AiService {
  private streamingSignal = createSignal(false)

  private modelsMemo: Accessor<Model[]>

  get models() {
    return this.modelsMemo()
  }

  get chatModel(): Model | undefined {
    return this.store.ai?.model
  }

  get streaming() {
    return this.streamingSignal[0]
  }

  get sidebarWidth() {
    const w = this.store.ai?.sidebarWidth
    return w ? `${w}px` : '50vw'
  }

  constructor(
    private copilotService: CopilotService,
    private ollamaService: OllamaService,
    private llamaCppService: LlamaCppService,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {
    this.modelsMemo = createMemo(() => [
      ...(this.store.ai?.copilot?.user ? this.copilotService.models : []),
      ...(this.store.ai?.ollama?.enabled ? this.ollamaService.models : []),
      ...(this.store.ai?.llamaCpp?.enabled ? this.llamaCppService.models : []),
    ])
  }

  async setSidebarWidth(width: number) {
    this.setState('ai', 'sidebarWidth', width)
    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }

  async setChatModel(model: Model) {
    info(`Set chat model (model=${JSON.stringify(model)})`)
    this.setState('ai', (ai) => ({...ai, model}))
    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }

  async completions(
    messages: ChatMessage[],
    onChunk: (chunk: Chunk) => void,
    streaming: boolean | undefined = undefined,
  ): Promise<CompletionsResult> {
    this.streamingSignal[1](true)
    try {
      switch (this.store.ai?.model?.provider) {
        case 'copilot': {
          return await this.copilotService.completions(messages, onChunk, streaming)
        }
        case 'ollama': {
          return await this.ollamaService.completions(messages, onChunk, streaming)
        }
        case 'llama.cpp': {
          return await this.llamaCppService.completions(messages, onChunk, streaming)
        }
        default:
          throw new Error('No model selected')
      }
    } finally {
      this.streamingSignal[1](false)
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
    this.copilotService.stop()
    this.ollamaService.stop()
    this.llamaCppService.stop()
  }
}
