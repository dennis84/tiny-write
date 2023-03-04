import {EditorState, Plugin} from 'prosemirror-state'
import {Schema, SchemaSpec} from 'prosemirror-model'
import {NodeViewConstructor} from 'prosemirror-view'

export type NodeViewConfig = {[key: string]: NodeViewConstructor};

export interface ProseMirrorExtension {
  schema?: (prev: SchemaSpec) => SchemaSpec;
  plugins?: (prev: Plugin[], schema: Schema) => Plugin[];
  nodeViews?: NodeViewConfig;
}

export const isEmpty = (state?: EditorState) => !state || (
  state.doc.childCount == 1 &&
  !state.doc.firstChild?.type.spec.code &&
  state.doc.firstChild?.isTextblock &&
  state.doc.firstChild.content.size == 0
)
