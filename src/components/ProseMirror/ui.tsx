import React, {ReactNode, createContext, useContext, useEffect, useState, useRef} from 'react'
import {EditorState} from 'prosemirror-state'
import {Schema} from 'prosemirror-model'
import {EditorView} from 'prosemirror-view'
import {defaultSchema} from './schema'
import {CodeBlockView} from './plugins/code-block'

interface Props {
  state: EditorState;
  onChange: (state: EditorState) => void;
  className?: string;
  schema?: Schema;
}

const createEditor = (editorNode: Element, props: Props) => {
  const schema = props.schema ?? defaultSchema
  const view = new EditorView(editorNode, {
    state: props.state,
    nodeViews: {
      code_block: (node, view, getPos, decos) => {
        return new CodeBlockView(node, view, getPos, schema, decos)
      },
    },
    dispatchTransaction(tr) {
      const newState = view.state.apply(tr)
      view.updateState(newState)
      props.onChange(newState)
    }
  })

  return view
}

export const ProseMirror = (props: Props) => {
  const editorRef = useRef()
  const view = useRef(null)
  const [,setEditorView] = useContext(ProseMirrorContext)

  useEffect(() => {
    if (view.current) {
      view.current.updateState(props.state)
    } else {
      const editorView = createEditor(editorRef.current, props)
      editorView.focus()
      view.current = editorView
      setEditorView(editorView)
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
