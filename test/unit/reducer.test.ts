import {Open, newState} from '../../src/reducer'
import {EditorState} from 'prosemirror-state'
import {schema} from 'prosemirror-markdown'

const text = {
  doc: {
    type: 'doc',
    content: [{type: 'paragraph', content: [{type: 'text', text: 'Test'}]}]
  },
  selection: {
    type: 'text',
    anchor: 1,
    head: 1
  }
}

const editorState = EditorState.fromJSON({schema}, text)

it('Open text', () => {
  const state = newState({})
  const result = Open({text})(state)
  expect(result.files.length).toBe(0)
  expect(result.text.editorState).toEqual(text)
  expect(result.text.extensions).toBe(undefined)
})

it('Open text - add to files', () => {
  const state = newState({
    text: {editorState},
    lastModified: new Date(),
  })
  const result = Open({text})(state)
  expect(result.files.length).toBe(1)
  expect(result.text.editorState).toEqual(text)
  expect(result.text.extensions).toBe(undefined)
})

it('Open text - dont add if not modified', () => {
  const state = newState({
    text: {editorState},
  })
  const result = Open({text})(state)
  expect(result.files.length).toBe(0)
  expect(result.text.editorState).toEqual(text)
  expect(result.text.extensions).toBe(undefined)
})

it('Open path', () => {
  const state = newState({})
  const result = Open({path: '/foo'})(state)
  expect(result.files.length).toBe(0)
  expect(result.text.editorState).toEqual(undefined)
  expect(result.text.extensions).toBe(undefined)
  expect(result.path).toBe('/foo')
})

it('Open path - in files', () => {
  const lastModified = new Date().toISOString()
  const state = newState({
    files: [
      {path: '/foo', lastModified},
      {path: '/bar'},
    ]
  })

  const result = Open({path: '/foo'})(state)
  expect(result.files.length).toBe(1)
  expect(result.text.editorState).toEqual(undefined)
  expect(result.text.extensions).toBe(undefined)
  expect(result.path).toBe('/foo')
  expect(result.lastModified).toEqual(new Date(lastModified))
})

it('Open path - push path to files', () => {
  const lastModified = new Date()
  const state = newState({
    text: {editorState},
    lastModified,
    path: '/foo',
  })

  const result = Open({path: '/bar'})(state)
  expect(result.files.length).toBe(1)
  expect(result.files[0].path).toBe('/foo')
  expect(result.files[0].lastModified).toBe(lastModified.toISOString())
  expect(result.text.editorState).toEqual(undefined)
  expect(result.text.extensions).toBe(undefined)
  expect(result.path).toBe('/bar')
})
