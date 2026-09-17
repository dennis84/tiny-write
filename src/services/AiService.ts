import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {info} from '@/remote/log'
import type {ChatRole, Model, State} from '@/types'
import type {CopilotService} from './CopilotService'
import type {LlamaCppService} from './LlamaCppService'
import type {OllamaService} from './OllamaService'

export interface CompletionsRequest {
  intent: boolean
  n: number
  stream: boolean
  temperature: number
  model: string
  messages: ChatMessage[]
}

interface ChatMessageContent {
  type: string
}

export interface ChatMessageImageContent extends ChatMessageContent {
  type: 'image_url'
  image_url: {
    url: string
  }
}

export interface ChatMessageTextContent extends ChatMessageContent {
  type: 'text'
  text: string
}

export interface ChatMessage {
  role: ChatRole
  content: (ChatMessageTextContent | ChatMessageImageContent)[]
}

export interface Choice {
  message: {content: string}
  delta?: {content: string}
}

export interface Chunk {
  choices: Choice[]
}

export interface CompletionsResult {
  success: boolean
  interrupted?: boolean
  error?: string
}

export class AiService {
  private streamingSignal = createSignal(false)

  private modelsMemo: Accessor<Model[]>

  get models() {
    return this.modelsMemo()
  }

  get chatModel(): Model | undefined {
    return this.store.ai?.model ?? this.models[0]
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
    const model = this.chatModel

    try {
      switch (model?.provider) {
        case 'copilot': {
          return await this.copilotService.completions(model, messages, onChunk, streaming)
        }
        case 'ollama': {
          return await this.ollamaService.completions(model, messages, onChunk, streaming)
        }
        case 'llama.cpp': {
          return await this.llamaCppService.completions(model, messages, onChunk, streaming)
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
