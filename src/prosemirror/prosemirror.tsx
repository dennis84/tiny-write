import React, {useEffect, useRef} from 'react'
import {Plugin, EditorState} from 'prosemirror-state'
import {Decoration, EditorView, NodeView} from 'prosemirror-view'
import {Schema, SchemaSpec} from 'prosemirror-model'

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
  initialized?: boolean;
}

interface Props {
  state: ProseMirrorState;
  onChange: (state: EditorState) => void;
  onInit: (state: EditorState) => void;
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
      initialized: true,
    })
  }

  useEffect(() => {
    if (!editorViewRef.current) {
      const {state, nodeViews} = createEditorState(props.state)
      const view = new EditorView(editorRef.current, {state, nodeViews, dispatchTransaction})
      editorViewRef.current = view
      view.focus()
      props.onInit({
        ...props.state,
        editorState: state,
        initialized: true,
      })
    } else if (props.state.initialized) {
      editorViewRef.current.updateState(props.state.editorState)
    } else {
      console.log('Recreate prosemirror state')
      const {state, nodeViews} = createEditorState(props.state)
      editorViewRef.current.update({state, nodeViews, dispatchTransaction})
      props.onInit({
        ...props.state,
        editorState: state,
        initialized: true,
      })
    }
  }, [props.state])

  return (
    <div ref={editorRef} className={props.className} spellCheck={false} />
  )
}

const createEditorState = (state: ProseMirrorState) => {
  let nodeViews = {}
  let schemaSpec = {}
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
    state: editorState,
    nodeViews,
  }
}

export const isEmpty = (state?: EditorState) => !state || (
  state.doc.childCount == 1 &&
  state.doc.firstChild.isTextblock &&
  state.doc.firstChild.content.size == 0
)
