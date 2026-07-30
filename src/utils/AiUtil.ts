import {error, info} from '@/remote/log'
import type {
  ChatMessage,
  Chunk,
  CompletionsRequest,
  CompletionsResult,
  Model,
} from '@/services/CopilotService'

export class AiUtil {
  static async getStreamResponse(
    data: Response,
    onChunk: (chunk: Chunk) => void,
    signal: AbortSignal,
  ): Promise<CompletionsResult> {
    const result: CompletionsResult = {success: false}
    const reader = data.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    if (!reader) return result

    const parseLine = (s: string): Chunk | undefined => {
      try {
        const data = s.substring('data: '.length)
        if (data.startsWith('[DONE]'))
          return undefined // can end with \n
        else return JSON.parse(data)
      } catch (e) {
        error(`Failed to parse line (s=${s})`, e)
        return undefined
      }
    }

    let finished = false

    const finish = () => {
      if (finished) return
      finished = true

      info(`Finishing stream response (interrupted=${signal.aborted})`)
      if (signal.aborted) {
        result.interrupted = true
      } else {
        result.success = true
      }
    }

    while (!finished) {
      const {value, done} = await reader.read()
      if (done || signal.aborted) {
        finish()
        break
      }

      buffer += decoder.decode(value, {stream: true})
      const lines = buffer.split('\n\n')

      for (let i = 0; i < lines.length - 1; i++) {
        const data = parseLine(lines[i])
        if (!data) {
          finish()
        } else {
          onChunk(data)
        }
      }

      buffer = lines[lines.length - 1]
    }

    if (buffer) {
      const data = parseLine(buffer)
      if (!data) finish()
      else onChunk(data)
    }

    return result
  }

  static createRequest(
    model: Model,
    messages: ChatMessage[],
    streaming: boolean | undefined = undefined,
  ): CompletionsRequest {
    return {
      intent: true, // Enables intent detection/classification for the request
      n: 1, // Number of response completions to generate
      stream: streaming ?? model.streaming, // Whether to stream the response; uses provided value or falls back to model's default
      temperature: 0.1, // Controls randomness (0-2); low value = more focused/deterministic responses
      model: model.id, // Identifier of the AI model to use
      messages, // Array of conversation messages (user/assistant history)
    }
  }
}
