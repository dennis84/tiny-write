import React, {useEffect, useRef} from 'react'
import {EditorState, Transaction} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {Schema} from 'prosemirror-model'
import {NodeViewFn, ProseMirrorState} from './state'

interface Props {
  state: ProseMirrorState;
  onChange: (state: ProseMirrorState) => void;
  onInit: (state: ProseMirrorState) => void;
  onReconfigure: (state: ProseMirrorState) => ProseMirrorState;
  className?: string;
  editorViewRef?: React.MutableRefObject<EditorView>;
}

export const ProseMirror = (props: Props) => {
  const editorRef = useRef()
  const editorViewRef = props.editorViewRef ?? useRef()

  const dispatchTransaction = (tr: Transaction) => {
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

    let state = {...props.state}
    if (props.state.extensions === undefined) {
      state = props.onReconfigure(props.state)
    }

    if (!editorViewRef.current) {
      const {editorState, nodeViews} = createEditorState(props.state)
      const view = new EditorView(editorRef.current, {state: editorState, nodeViews, dispatchTransaction})
      editorViewRef.current = view
      view.focus()
      props.onInit({...state, editorState})
    } else if (state.editorState instanceof EditorState) {
      editorViewRef.current.updateState(state.editorState)
    } else if (state.editorState) {
      const {editorState, nodeViews} = createEditorState(state)
      if (!editorState) return
      editorViewRef.current.update({state: editorState, nodeViews, dispatchTransaction})
      props.onInit({...state, editorState})
    }
  }, [props.state])

  return (
    <div
      ref={editorRef}
      className={props.className}
      spellCheck={false}
      data-tauri-drag-region="true" />
  )
}

const createEditorState = (state: ProseMirrorState): {
  editorState: EditorState;
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
    editorState: editorState as EditorState,
    nodeViews,
  }
}
