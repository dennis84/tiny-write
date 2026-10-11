import type {ModelMessage} from 'ai'

export class ThreadContext {
  private _system = ''
  private _messages: ModelMessage[] = []

  // Incoming AI response creates a tree node with this parentId
  public parentId: string | undefined
  // Stream incoming AI response to this tree node ID
  public nextId: string | undefined

  // Maybe system messages: common\n\ncodeHandling\n\nsummary
  // Must be a single string for some LLMs
  get system(): string | undefined {
    if (!this._system) return undefined
    return this._system
  }

  // Thread conversation:
  // - question1
  // - answer1
  // - question2
  // - answer2
  // - user message
  get messages(): ModelMessage[] {
    return this._messages
  }

  set messages(messages: ModelMessage[]) {
    this._messages = messages
  }

  addSystemMessage(message: string) {
    if (this._system !== '') this._system += '\n\n'
    this._system += message
  }

  addMessage(message: ModelMessage) {
    this._messages.push(message)
  }

  tokenCount(): {inputTokens: number; outputTokens: number} {
    let outputTokens = 0
    let inputTokens = this.countText(this.system ?? '')

    for (const message of this.messages) {
      if (message.role === 'user') {
        if (typeof message.content === 'string') {
          inputTokens += this.countText(message.content)
        } else if (Array.isArray(message.content)) {
          message.content.forEach((c) => {
            if (c.type === 'text') inputTokens += this.countText(c.text)
          })
        }
      } else if (message.role === 'assistant') {
        if (typeof message.content === 'string') {
          outputTokens += this.countText(message.content)
        } else if (Array.isArray(message.content)) {
          message.content.forEach((c) => {
            if (c.type === 'text') outputTokens += this.countText(c.text)
          })
        }
      }
    }

    return {inputTokens, outputTokens}
  }

  toString() {
    return JSON.stringify([{role: 'system', content: this._system}, ...this._messages])
  }

  private countText(text: string): number {
    const words = text.split(/\s+/).length
    const chars = text.length
    const punctuation = (text.match(/[^a-zA-Z0-9\s]/g) || []).length
    return Math.ceil(words * 1.3 + punctuation * 0.5 + chars / 15)
  }
}
