import {completion} from '../../../src/prosemirror/extension/code-block/completion'
import {CompletionContext} from '@codemirror/autocomplete'
import {Compartment, EditorState} from '@codemirror/state'
import {javascript} from '@codemirror/lang-javascript'

it.each([
  [`const foo = 'bar'`, ['const', 'foo', 'bar']],
  [`....test`, ['test']],
  [`123`, ['123']],
  [`x+y*z`, []],
])('findWords', async (doc, words) => {
  const [findWords] = completion
  const language = new Compartment()
  const state = EditorState.create({
    doc,
    extensions: [language.of(javascript())]
  })

  const context = new CompletionContext(state, state.doc.length + 1, false)
  const result = await findWords(context)
  words.forEach((w, i) => {
    expect(result.options[i].label).toBe(w)
  })
})
