import {createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {info} from '@/remote/log'
import type {AiProvider, State} from '@/types'
import type {ChatMessage, Chunk, CompletionsResult, CopilotService, Model} from './CopilotService'
import type {OllamaService} from './OllamaService'

export class AiService {
  private streamingSignal = createSignal(false)

  get chatModel(): Model {
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
  ) {}

  async setSidebarWidth(width: number) {
    this.setState('ai', 'sidebarWidth', width)
    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }

  async getChatModels(): Promise<Record<AiProvider, Model[]> | undefined> {
    const [copilot, ollama] = await Promise.all([
      this.store.ai?.copilot?.user ? this.copilotService.getChatModels() : [],
      this.store.ai?.ollama?.enabled ? this.ollamaService.getChatModels() : [],
    ])
    return {copilot, ollama}
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
          throw new Error('undefined provider')
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
