import {Plugin, EditorState} from 'prosemirror-state'
import {Schema, SchemaSpec} from 'prosemirror-model'
import {NodeViewConstructor} from 'prosemirror-view'

export interface ProseMirrorExtension {
  schema?: (prev: SchemaSpec) => SchemaSpec;
  plugins?: (prev: Plugin[], schema: Schema) => Plugin[];
  nodeViews?: {[key: string]: NodeViewConstructor};
}

export type ProseMirrorState = EditorState | unknown

export const isEmpty = (state: any) => !state || (
  state.doc.childCount == 1 &&
  !state.doc.firstChild.type.spec.code &&
  state.doc.firstChild.isTextblock &&
  state.doc.firstChild.content.size == 0
)
