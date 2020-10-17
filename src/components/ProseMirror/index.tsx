import React, {useEffect, useState, useRef} from 'react'
import {EditorState} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {createEmptyState} from './state'
import {schema} from './schema'
import {CodeBlockView} from './code-block'

interface Props {
  state?: EditorState;
  onChange: (state: EditorState) => void;
  className: string;
  viewRef?: any;
}

const createEditor = (editorNode, props) => {
  const view = new EditorView(editorNode, {
    state: props.state ?? createEmptyState(),
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

  if (props.viewRef) props.viewRef.current = view
  return view
}

export default (props: Props) => {
  const editorRef = useRef()
  const [view, setView] = useState(null)

  useEffect(() => {
    if (view) view.updateState(props.state ?? createEmptyState())
  }, [props.state])

  useEffect(() => {
    const editorView = createEditor(editorRef.current, props)
    editorView.focus()
    setView(editorView)
  }, [])

  return (
    <div ref={editorRef} className={props.className} />
  )
}
