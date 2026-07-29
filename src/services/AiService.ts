import {createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {info} from '@/remote/log'
import type {State} from '@/types'
import type {ChatMessage, Chunk, CompletionsResult, CopilotService, Model} from './CopilotService'

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
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  async setSidebarWidth(width: number) {
    this.setState('ai', 'sidebarWidth', width)
    const ai = this.store.ai
    if (ai) await DB.setAi(ai)
  }

  async getChatModels(): Promise<Model[] | undefined> {
    return this.copilotService.getChatModels()
  }

  async setChatModel(model: Model) {
    info(`Set chat model (model=${JSON.stringify(model)})`)
    this.setState('ai', 'model', model)
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
      return await this.copilotService.completions(messages, onChunk, streaming)
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
  }
}
