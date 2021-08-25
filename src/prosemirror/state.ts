import {Plugin, EditorState} from 'prosemirror-state'
import {Node, Schema, SchemaSpec} from 'prosemirror-model'
import {Decoration, EditorView, NodeView} from 'prosemirror-view'

export interface ProseMirrorExtension {
  schema?: (prev: SchemaSpec) => SchemaSpec;
  plugins?: (prev: Plugin[], schema: Schema) => Plugin[];
  nodeViews?: {[key: string]: NodeViewFn};
}

export interface ProseMirrorState {
  editorState?: EditorState | {[key: string]: any};
  extensions?: ProseMirrorExtension[];
}

export type NodeViewFn = (
  node: Node,
  view: EditorView,
  getPos: () => number,
  decorations: Decoration[],
) => NodeView

export const isInitialized = (state: any) =>
  state !== undefined && state instanceof EditorState

export const isEmpty = (state: any) => {
  return !isInitialized(state) || (
    state.doc.childCount == 1 &&
    !state.doc.firstChild.type.spec.code &&
    state.doc.firstChild.isTextblock &&
    state.doc.firstChild.content.size == 0
  )
}
