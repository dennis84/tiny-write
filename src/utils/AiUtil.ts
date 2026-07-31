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

    // 'done' signals the [DONE] sentinel was reached; undefined signals a parse error
    // that should be skipped instead of terminating the stream.
    const parseLine = (s: string): Chunk | 'done' | undefined => {
      try {
        const data = s.substring('data: '.length)
        if (data.startsWith('[DONE]'))
          return 'done' // can end with \n
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

    try {
      outer: while (!finished) {
        let value: Uint8Array | undefined
        let done: boolean | undefined

        try {
          ;({value, done} = await reader.read())
        } catch (e) {
          info(`Stream read failed (aborted=${signal.aborted})`, e)
          finish()
          break
        }

        if (done || signal.aborted) {
          finish()
          break
        }

        buffer += decoder.decode(value, {stream: true})
        const lines = buffer.split('\n\n')

        for (let i = 0; i < lines.length - 1; i++) {
          const data = parseLine(lines[i])
          if (data === 'done') {
            finish()
            break outer
          } else if (data !== undefined) {
            onChunk(data)
          }
        }

        buffer = lines[lines.length - 1]
      }

      if (!finished && buffer) {
        const data = parseLine(buffer)
        if (data === 'done') finish()
        else if (data !== undefined) onChunk(data)
      }
    } finally {
      try {
        await reader.cancel()
      } catch {
        // ignore cancel errors (e.g. stream already closed)
      }
      reader.releaseLock()
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
