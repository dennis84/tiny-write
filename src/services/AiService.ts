import type {OpenAICompatibleProvider} from '@ai-sdk/openai-compatible'
import {generateText, stepCountIs, streamText} from 'ai'
import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {debug, error, info} from '@/remote/log'
import type {Model, State, ToolCall} from '@/types'
import type {ThreadContext} from '@/utils/ThreadContext'
import {BraveSearchService} from './BraveSearchService'
import type {CopilotService} from './CopilotService'
import type {LlamaCppService} from './LlamaCppService'
import type {OllamaService} from './OllamaService'

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
  private streamingSignal = createSignal<AbortController | undefined>()

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
    context: ThreadContext,
    onChunk: (chunk: string) => void,
    onToolCall?: (toolCall: ToolCall) => void,
  ): Promise<CompletionsResult> {
    const model = this.chatModel
    if (!model) throw new Error('No model selected')
    const provider = await this.getProvider(model?.provider)

    debug(
      `Send completions request - (model=${model.id}, provider=${model.provider}, messages=${context.toString()})`,
    )

    if (!provider) return {success: false, error: 'No access token'}

    const controller = new AbortController()
    this.streamingSignal[1](controller)

    const ret: CompletionsResult = {success: true}

    const result = streamText({
      model: provider(model.id),
      system: context.system,
      messages: context.messages,
      abortSignal: controller.signal,
      tools: {
        braveSearch: BraveSearchService.getTool(),
      },
      stopWhen: stepCountIs(5),
      onEnd: () => {
        this.streamingSignal[1](undefined)
      },
      onChunk: (event) => {
        if (
          event.chunk.type === 'tool-call' ||
          event.chunk.type === 'tool-result' ||
          event.chunk.type === 'tool-error'
        ) {
          const {chunk} = event
          onToolCall?.({
            id: chunk.toolCallId,
            toolName: chunk.toolName,
            input: chunk.input as Record<string, any>,
            result: chunk.type === 'tool-result' ? chunk.output : undefined,
            status: event.chunk.type,
          })
        }
      },
      onError: (event) => {
        error(`Error during streamText`, event.error)
        this.streamingSignal[1](undefined)
        ret.success = false
        ret.error = event.error instanceof Error ? event.error.message : String(event.error)
      },
      onAbort: () => {
        this.streamingSignal[1](undefined)
        ret.interrupted = true
        ret.success = false
      },
    })

    for await (const part of result.textStream) {
      onChunk(part)
    }

    return ret
  }

  async completionsSync(context: ThreadContext): Promise<string | undefined> {
    const model = this.chatModel
    if (!model) throw new Error('No model selected')
    const provider = await this.getProvider(model?.provider)
    if (!provider) throw new Error('No provider')

    const result = await generateText({
      model: provider(model.id),
      system: context.system,
      messages: context.messages,
    })

    return result.text
  }

  stop() {
    this.streamingSignal[0]()?.abort()
  }

  private async getProvider(name?: string): Promise<OpenAICompatibleProvider | undefined> {
    switch (name) {
      case 'copilot': {
        return await this.copilotService.getProvider()
      }
      case 'ollama': {
        return this.ollamaService.getProvider()
      }
      case 'llama.cpp': {
        return this.llamaCppService.getProvider()
      }
    }
  }
}
