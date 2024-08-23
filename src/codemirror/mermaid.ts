import {CompletionSource} from '@codemirror/autocomplete'

const syntax: Record<string, string[]> = {
  flowchart: ['subgraph'],
  sequenceDiagram: ['actor', 'activate', 'deactivate', 'participant', 'autonumber'],
  classDiagram: ['class', '<<interface>>', '<<enumeration>>'],
  erDiagram: [],
}

export const mermaidKeywords: CompletionSource = (context) => {
  const word = context.matchBefore(/\w*/)
  if (!word) {
    return null
  }

  if (word.from == word.to && !context.explicit) {
    return null
  }

  const type = context.state.doc.line(1).text
  const keywords = syntax[type] ?? Object.keys(syntax)

  return {
    from: word.from,
    options: keywords.map((label: string) => ({label, type: 'keyword'})),
  }
}
