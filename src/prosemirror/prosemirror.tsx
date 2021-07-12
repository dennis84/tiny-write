import React, {useEffect, useRef} from 'react'
import {Plugin, EditorState} from 'prosemirror-state'
import {Decoration, EditorView, NodeView} from 'prosemirror-view'
import {Schema, SchemaSpec, Node} from 'prosemirror-model'

type NodeViewFn = (
  node: Node,
  view: EditorView,
  getPos: () => number,
  decorations: Decoration[]
) => NodeView

export interface ProseMirrorExtension {
  schema?: (prev: SchemaSpec) => SchemaSpec;
  plugins?: (prev: Plugin[], schema: Schema) => Plugin[];
  nodeViews?: {[key: string]: NodeViewFn};
}

export interface ProseMirrorState {
  editorState?: EditorState | unknown;
  extensions: ProseMirrorExtension[];
}

interface Props {
  state: ProseMirrorState;
  onChange: (state: ProseMirrorState) => void;
  onInit: (state: ProseMirrorState) => void;
  className?: string;
  editorViewRef?: React.MutableRefObject<EditorView>;
}

export const ProseMirror = (props: Props) => {
  const editorRef = useRef()
  const editorViewRef = props.editorViewRef ?? useRef()

  const dispatchTransaction = (tr) => {
    if (!editorViewRef.current) return
    const newState = editorViewRef.current.state.apply(tr)
    editorViewRef.current.updateState(newState)
    if (!tr.docChanged) return
    props.onChange({
      ...props.state,
      editorState: newState,
    })
  }

  useEffect(() => {
    if (!props.state.editorState) return
    if (!editorViewRef.current) {
      const {state, nodeViews} = createEditorState(props.state)
      const view = new EditorView(editorRef.current, {state, nodeViews, dispatchTransaction})
      editorViewRef.current = view
      view.focus()
      props.onInit({
        ...props.state,
        editorState: state,
      })
    } else if (props.state.editorState instanceof EditorState) {
      editorViewRef.current.updateState(props.state.editorState)
    } else if (props.state.editorState) {
      const {state, nodeViews} = createEditorState(props.state)
      if (!state) return
      editorViewRef.current.update({state, nodeViews, dispatchTransaction})
      props.onInit({
        ...props.state,
        editorState: state,
      })
    }
  }, [props.state])

  return (
    <div ref={editorRef} className={props.className} spellCheck={false} />
  )
}

const createEditorState = (state: ProseMirrorState): {
  state: EditorState;
  nodeViews: {[key: string]: NodeViewFn};
} => {
  let nodeViews = {}
  let schemaSpec = {nodes: {}}
  let plugins = []

  for (const extension of state.extensions) {
    if (extension.schema) {
      schemaSpec = extension.schema(schemaSpec)
    }

    if (extension.nodeViews) {
      nodeViews = {...nodeViews, ...extension.nodeViews}
    }
  }

  const schema = new Schema(schemaSpec)
  for (const extension of state.extensions) {
    if (extension.plugins) {
      plugins = extension.plugins(plugins, schema)
    }
  }

  let editorState = state.editorState
  if (!(editorState instanceof EditorState)) {
    editorState = EditorState.fromJSON({
      schema,
      plugins,
    }, editorState)
  }

  return {
    state: (editorState as EditorState),
    nodeViews,
  }
}

export const isInitialized = (state: any) =>
  state !== undefined && state instanceof EditorState

export const isEmpty = (state: any) =>
  !isInitialized(state) || (
    state.doc.childCount == 1 &&
    !state.doc.firstChild.type.spec.code &&
    state.doc.firstChild.isTextblock &&
    state.doc.firstChild.content.size == 0
  )
