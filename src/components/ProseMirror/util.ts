import {EditorState} from 'prosemirror-state'

export const isEmpty = (state?: EditorState) => !state || (
  state.doc.childCount == 1 &&
  state.doc.firstChild.isTextblock &&
  state.doc.firstChild.content.size == 0
)
