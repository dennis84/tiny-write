import {expect, it} from 'vitest'

import {mermaidKeywords} from '@/prosemirror/code-block/mermaid'
import {EditorState} from '@codemirror/state'
import {CompletionContext} from '@codemirror/autocomplete'

it('mermaid keywords - diagrams', async () => {
  const state = EditorState.create({
    doc: 'a',
    extensions: []
  })

  const context = new CompletionContext(state, 1, false)
  const result = await mermaidKeywords(context)

  expect(result.options.find((x) => x.label === 'sequenceDiagram')).toBeDefined()
  expect(result.options.find((x) => x.label === 'flowchart')).toBeDefined()
  expect(result.options.find((x) => x.label === 'classDiagram')).toBeDefined()
})

it('mermaid keywords - keywords', async () => {
  const doc = 'sequenceDiagram\na'
  const state = EditorState.create({doc, extensions: []})

  const context = new CompletionContext(state, doc.length, false)
  const result = await mermaidKeywords(context)
  console.log('>>>', result)

  expect(result.options.find((x) => x.label === 'actor')).toBeDefined()
  expect(result.options.find((x) => x.label === 'activate')).toBeDefined()
  expect(result.options.find((x) => x.label === 'deactivate')).toBeDefined()
  expect(result.options.find((x) => x.label === 'autonumber')).toBeDefined()
})
