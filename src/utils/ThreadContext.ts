import type {ModelMessage} from 'ai'

export class ThreadContext {
  private _system = ''
  private _messages: ModelMessage[] = []
  private _hasCodeBlocks = false

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

  get hasCodeBlocks() {
    return this._hasCodeBlocks
  }

  addSystemMessage(message: string) {
    if (this._system !== '') this._system += '\n\n'
    this._system += message
  }

  addMessage(message: ModelMessage) {
    this._messages.push(message)

    if (message.role === 'user') {
      const checkCode = (text: string) => text.includes('```')
      if (typeof message.content === 'string') {
        if (checkCode(message.content)) {
          this._hasCodeBlocks = true
        }
      } else if (Array.isArray(message.content)) {
        for (const c of message.content) {
          if (c.type === 'text' && checkCode(c.text)) this._hasCodeBlocks = true
        }
      }
    }
  }

  toString() {
    return JSON.stringify([{role: 'system', content: this._system}, ...this._messages])
  }
}
