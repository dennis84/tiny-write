import type {OpenAICompatibleProvider} from '@ai-sdk/openai-compatible'
import {generateText, stepCountIs, streamText} from 'ai'
import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {DB} from '@/db'
import {debug, error, info} from '@/remote/log'
import type {Model, State, Usage} from '@/types'
import {MessageUtil} from '@/utils/MessageUtil'
import type {ThreadContext} from '@/utils/ThreadContext'
import {BraveSearchService} from './BraveSearchService'
import type {CopilotService} from './CopilotService'
import type {LlamaCppService} from './LlamaCppService'
import type {OllamaService} from './OllamaService'

export interface TextChunk {
  kind: 'text'
  delta: string
}

export interface ReasoningChunk {
  kind: 'reasoning'
  id: string
  delta?: string
  startDate?: Date
  endDate?: Date
}

export interface ToolCallChunk {
  kind: 'tool-call'
  id: string
  toolName: string
  input?: Record<string, any>
  result?: any
  startDate?: Date
  endDate?: Date
}

export interface CompletionsResult {
  success: boolean
  interrupted?: boolean
  error?: string
  usage?: Usage
}

export type Chunk = TextChunk | ReasoningChunk | ToolCallChunk

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

  get enabled() {
    return (
      this.store.ai?.copilot?.user ||
      this.store.ai?.llamaCpp?.enabled ||
      this.store.ai?.ollama?.enabled
    )
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
    onChunk: (chunk: Chunk) => void,
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
      providerOptions: {
        openai: {reasoningEffort: 'medium', reasoningSummary: 'auto'},
        anthropic: {thinking: {type: 'enabled', budgetTokens: 4000}},
        google: {thinkingConfig: {thinkingBudget: 2048, includeThoughts: true}},
      },
      stopWhen: stepCountIs(5),
      onEnd: () => {
        this.streamingSignal[1](undefined)
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

    for await (const part of result.stream) {
      switch (part.type) {
        case 'text-delta':
          onChunk({
            kind: 'text',
            delta: part.text,
          })
          break
        case 'reasoning-start':
          onChunk({
            kind: 'reasoning',
            id: part.id,
            startDate: new Date(),
          })
          break
        case 'reasoning-end':
          onChunk({
            kind: 'reasoning',
            id: part.id,
            endDate: new Date(),
          })
          break
        case 'reasoning-delta':
          onChunk({
            kind: 'reasoning',
            id: part.id,
            delta: part.text,
          })
          break
        case 'tool-input-start':
          onChunk({
            kind: 'tool-call',
            id: part.id,
            toolName: part.toolName,
            startDate: new Date(),
          })
          break
        case 'tool-call':
        case 'tool-error':
          onChunk({
            kind: 'tool-call',
            id: part.toolCallId,
            toolName: part.toolName,
            input: part.input as Record<string, any>,
          })
          break
        case 'tool-result':
          onChunk({
            kind: 'tool-call',
            id: part.toolCallId,
            toolName: part.toolName,
            result: part.output,
            endDate: new Date(),
          })
          break
      }
    }

    try {
      const rawUsage = await result.usage
      const usage: Usage = {
        inputTokens: rawUsage.inputTokens ?? 0,
        outputTokens: rawUsage.outputTokens ?? 0,
      }
      if (!MessageUtil.isEmptyUsage(usage)) {
        ret.usage = usage
      }
    } catch (e) {
      error('Failed to read usage', e)
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
    this.streamingSignal[0]()?.abort('Interrupted by user')
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
