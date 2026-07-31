import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {info} from '@/remote/log'
import type {AiProvider, State} from '@/types'
import type {ChatMessage, Chunk, CompletionsResult, CopilotService, Model} from './CopilotService'
import type {OllamaService} from './OllamaService'

export class AiService {
  private streamingSignal = createSignal(false)

  private modelsMemo: Accessor<Record<AiProvider, Model[]>>

  get models() {
    return this.modelsMemo()
  }

  get chatModel(): Model | undefined {
    return this.store.ai?.model ?? this.copilotService.fallbackModel
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
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {
    this.modelsMemo = createMemo(() => ({
      copilot: this.store.ai?.copilot?.user ? this.copilotService.models : [],
      ollama: this.store.ai?.ollama?.enabled ? this.ollamaService.models : [],
    }))
  }

  async setSidebarWidth(width: number) {
    this.setState('ai', 'sidebarWidth', width)
    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }

  async setChatModel(provider: AiProvider, model: Model) {
    info(`Set chat model (provider=${provider}, model=${JSON.stringify(model)})`)
    this.setState('ai', (ai) => ({...ai, model, provider}))
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
      switch (this.store.ai?.provider) {
        case 'copilot': {
          return await this.copilotService.completions(messages, onChunk, streaming)
        }
        case 'ollama': {
          return await this.ollamaService.completions(messages, onChunk, streaming)
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
  }
}
