import React, {ReactNode, createContext, useContext, useEffect, useState, useRef} from 'react'
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

  return [editorState, nodeViews]
}

export const ProseMirror = (props: Props) => {
  const editorRef = useRef()
  const [view, setEditorView] = useContext(ProseMirrorContext)

  useEffect(() => {
    if (!view) {
      const [state, nodeViews] = createEditorState(props.state)
      const view = new EditorView(editorRef.current, {
        state,
        nodeViews,
        dispatchTransaction(tr) {
          const newState = view.state.apply(tr)
          view.updateState(newState)
          props.onChange({
            ...props.state,
            editorState: newState,
            initialized: true,
          })
        }
      })

      setEditorView(view)
      view.focus()
      props.onInit({
        ...props.state,
        editorState: state,
        initialized: true,
      })
    } else if (props.state.initialized) {
      view.updateState(props.state.editorState)
    } else {
      const [state] = createEditorState(props.state)
      view.updateState(state)
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

type ProseMirrorContextState = [EditorView, (v: EditorView) => void]

const ProseMirrorContext = createContext<ProseMirrorContextState>([null, () => undefined]);

export const ProseMirrorProvider = (props: {children?: ReactNode}) => {
  const [editorView, setEditorView] = useState()
  return (
    <ProseMirrorContext.Provider value={[editorView, setEditorView]}>
      {props.children}
    </ProseMirrorContext.Provider>
  )
}

export const useProseMirror = () => useContext(ProseMirrorContext)[0]

export const isEmpty = (state?: EditorState) => !state || (
  state.doc.childCount == 1 &&
  state.doc.firstChild.isTextblock &&
  state.doc.firstChild.content.size == 0
)
