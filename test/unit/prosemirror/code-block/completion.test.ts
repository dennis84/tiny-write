import {expect, test} from 'vitest'
import {CompletionContext} from '@codemirror/autocomplete'
import {Compartment, EditorState} from '@codemirror/state'
import {javascript} from '@codemirror/lang-javascript'
import {markdown} from '@codemirror/lang-markdown'
import {findWords} from '@/prosemirror/code-block/completion'

test.each([
  ['abc', [], 3],
  ['abc ', ['abc'], 4],
  ['foo_bar ', ['foo_bar'], 8],
  [" const foo = 'bar'", ['const', 'foo', 'bar'], 0],
  ['....test', ['test'], 10],
  ['x+y*z', [], 10],
  ['K("Kafka")', ['Kafka'], 11],
])('findWords - js', async (doc, words, pos) => {
  const language = new Compartment()
  const state = EditorState.create({
    doc,
    extensions: [language.of(javascript())]
  })

  const context = new CompletionContext(state, pos, false)
  const result = await findWords(context)
  expect(result.options.length).toBe(words.length)
  words.forEach((w, i) => {
    expect(result.options[i].label).toBe(w)
  })
})

test.each([
  ['K("Kafka")', ['Kafka'], 11],
])('findWords - markdown', async (doc, words, pos) => {
  const language = new Compartment()
  const state = EditorState.create({
    doc,
    extensions: [language.of(markdown())]
  })

  const context = new CompletionContext(state, pos, false)
  const result = await findWords(context)
  expect(result.options.length).toBe(words.length)
  words.forEach((w, i) => {
    expect(result.options[i].label).toBe(w)
  })
})
