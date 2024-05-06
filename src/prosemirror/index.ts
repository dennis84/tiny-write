import {EditorState} from 'prosemirror-state'
import {NodeViewConstructor} from 'prosemirror-view'

export interface ViewConfig {
  nodeViews?: NodeViewConfig;
}

export type NodeViewConfig = Record<string, NodeViewConstructor>;

export const isEmpty = (state?: EditorState) => !state || (
  state.doc.childCount == 1 &&
  !state.doc.firstChild?.type.spec.code &&
  state.doc.firstChild?.isTextblock &&
  state.doc.firstChild.content.size == 0
)
