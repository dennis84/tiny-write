import {expect, test} from 'vitest'
import {CompletionContext} from '@codemirror/autocomplete'
import {Compartment, EditorState} from '@codemirror/state'
import {javascript} from '@codemirror/lang-javascript'
import {findWords} from '../../../src/prosemirror/extension/code-block/completion'

test.each([
  ['abc', [], 3],
  ['abc ', ['abc'], 4],
  [` const foo = 'bar'`, ['const', 'foo', 'bar'], 0],
  [`....test`, ['test'], 10],
  [`x+y*z`, [], 10],
])('findWords', async (doc, words, pos) => {
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
