import React, {ReactNode, createContext, useContext, useEffect, useState, useRef} from 'react'
import {EditorState} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'

interface Props {
  state: EditorState;
  onChange: (state: EditorState) => void;
  className?: string;
}

const createEditor = (editorNode: Element, props: Props) => {
  let nodeViews = {}
  for (const plugin of props.state.plugins) {
    if (plugin.props.nodeViews) {
      nodeViews = {...nodeViews, ...plugin.props.nodeViews}
    }
  }

  const view = new EditorView(editorNode, {
    state: props.state,
    nodeViews,
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

export const isEmpty = (state?: EditorState) => !state || (
  state.doc.childCount == 1 &&
  state.doc.firstChild.isTextblock &&
  state.doc.firstChild.content.size == 0
)
