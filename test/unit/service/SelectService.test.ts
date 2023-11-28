import {vi, test, expect} from 'vitest'
import {schema} from 'prosemirror-markdown'
import {EditorView} from 'prosemirror-view'
import {EditorState} from 'prosemirror-state'
import {Box2d} from '@tldraw/primitives'
import {SelectService} from '@/services/SelectService'

test('selectBox', () => {
  const service = new SelectService()
  const node = document.createElement('div')
  const v = new EditorView(node, {
    state: EditorState.fromJSON({schema}, {
      doc: {
        type: 'doc',
        content: [
          {type: 'paragraph', content: [{type: 'text', text: '123'}]},
          {type: 'paragraph', content: [{type: 'text', text: '456'}]},
          {type: 'paragraph', content: [{type: 'text', text: '789'}]},
        ]
      },
      selection: {
        type: 'text',
        anchor: 1,
        head: 1
      }
    })
  })

  const coordsAtPos = vi.fn()
  EditorView.prototype.coordsAtPos = coordsAtPos
  coordsAtPos
    .mockReturnValueOnce({top: 1, left: 0, right: 0, bottom: 10})
    .mockReturnValueOnce({top: 11, left: 0, right: 0, bottom: 20})
    .mockReturnValueOnce({top: 21, left: 0, right: 0, bottom: 30})

  service.selectBox(new Box2d(0, 0, 1, 10), v, true, false)
  expect(v.state.selection.toJSON()).toContain({anchor: 1, head: 4})

  service.selectBox(new Box2d(0, 12, 0, 1), v, true, false)
  expect(v.state.selection.toJSON()).toContain({anchor: 6, head: 9})

  service.selectBox(new Box2d(0, 22, 0, 1), v, true, false)
  expect(v.state.selection.toJSON()).toContain({anchor: 11, head: 14})

  service.selectBox(new Box2d(0, 12, 0, 10), v, true, false)
  expect(v.state.selection.toJSON()).toContain({anchor: 6, head: 14})
})
