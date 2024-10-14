import {lspCompletion} from '@/remote'
import {CompletionSource} from '@codemirror/autocomplete'

// `class`, `constant`, `enum`,
// `function`, `interface`, `keyword`, `method`, `namespace`,
// `property`, `text`, `type`, `variable`
const typeMapping: Record<number, string> = {
  1: 'text',
  2: 'method',
  3: 'function',
  4: 'function', // constructor
  5: 'property', // field
  6: 'variable',
  7: 'class',
  8: 'interface',
  9: 'namespace', // module
  10: 'property',
  11: 'text', // unit
  12: 'text', // value
  13: 'enum',
  14: 'keyword',
  15: 'text', // snippet
  16: 'text', // color
  17: 'text', // file
  18: 'text', // reference
  19: 'text', // folder
  20: 'property', // enum_member
  21: 'constant',
  22: 'class', // struct
  23: 'property', // event
  24: 'keyword', // operator
  25: 'type', // type_parameter
}

export const lspCompletionSource =
  (path: string): CompletionSource =>
  async (context) => {
    let word = context.matchBefore(/\w*/)
    if (!word) return null

    const char = context.state.sliceDoc(word.from - 1, word.from)
    const pos = word.from

    const response = (await lspCompletion(path, pos, char)) as any

    if (!response?.items?.length) {
      return null
    }

    return {
      from: word.from,
      to: word.to,
      options: response.items.map((i: any) => {
        return {
          label: i.label,
          boost: parseInt(i.sortText, 10) * -1 + 1000,
          type: typeMapping[i.kind ?? -1] ?? 'word',
          detail: i.detail,
        }
      }),
    }
  }