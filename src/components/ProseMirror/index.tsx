import React, {useEffect, useState, useRef} from 'react'
import {EditorState} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {CodeBlockView} from './code-block'

interface Props {
  state?: EditorState;
  onChange: (state: EditorState) => void;
  className: string;
}

const createEditor = (editorNode, props) => {
  const view = new EditorView(editorNode, {
    state: props.state,
    nodeViews: {
      code_block: (node, view, getPos) => {
        return new CodeBlockView(node, view, getPos, props.state.schema)
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

export default (props: Props) => {
  const editorRef = useRef()
  const [view, setView] = useState(null)

  useEffect(() => {
    if (view) view.updateState(props.state)
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
