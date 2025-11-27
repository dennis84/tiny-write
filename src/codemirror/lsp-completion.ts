import type {CompletionSource} from '@codemirror/autocomplete'
import {lspCompletion} from '@/remote/lsp'

const kindToType: {[kind: number]: string} = {
  1: 'text', // Text
  2: 'method', // Method
  3: 'function', // Function
  4: 'class', // Constructor
  5: 'property', // Field
  6: 'variable', // Variable
  7: 'class', // Class
  8: 'interface', // Interface
  9: 'namespace', // Module
  10: 'property', // Property
  11: 'keyword', // Unit
  12: 'constant', // Value
  13: 'constant', // Enum
  14: 'keyword', // Keyword
  16: 'constant', // Color
  20: 'constant', // EnumMember
  21: 'constant', // Constant
  22: 'class', // Struct
  25: 'type', // TypeParameter
}

export const lspCompletionSource =
  (path: string): CompletionSource =>
  async (context) => {
    const word = context.matchBefore(/\w*/)
    if (!word) return null

    const char = context.state.sliceDoc(word.from - 1, word.from)
    const pos = word.from

    const options = []

    try {
      const completions = await lspCompletion(path, pos, char)
      for (const item of completions?.items ?? []) {
        options.push({
          label: item.label,
          boost: parseInt(item.sortText, 10) * -1 + 1000,
          type: kindToType[item.kind ?? -1] ?? 'word',
          detail: item.detail,
        })
      }
    } catch {
      // Ignore all completion errors including syntax errors during editing.
    }

    if (!options.length) {
      return null
    }

    return {
      from: word.from,
      to: word.to,
      options,
    }
  }
