import React from 'react'
import {EditorView} from 'prosemirror-view'
import {css} from '@emotion/css'
import {Config, Collab, ErrorObject, File} from '..'
import {UpdateText, useDispatch} from '../reducer'
import {ProseMirror} from '../prosemirror/editor'
import {ProseMirrorState, isInitialized} from '../prosemirror/state'
import {createState} from '../prosemirror'
import {editorCss} from './Layout'

interface Props {
  text: ProseMirrorState;
  error?: ErrorObject;
  lastModified?: Date;
  files: File[];
  config: Config;
  path?: string;
  collab?: Collab;
  markdown: boolean;
  keymap: {[key: string]: any};
  editorViewRef: React.RefObject<EditorView>;
}

export default (props: Props) => {
  const dispatch = useDispatch()

  const onInit = (value: ProseMirrorState) => {
    props.editorViewRef.current.focus()
    dispatch(UpdateText(value))
  }

  const onChange = (value: ProseMirrorState) => {
    dispatch(UpdateText(value, new Date()))
  }

  const onReconfigure = (state: ProseMirrorState) => {
    if (isInitialized(state.editorState)) return state
    return createState({
      data: state.editorState,
      config: props.config,
      markdown: props.markdown,
      path: props.path,
      keymap: props.keymap,
      y: props.collab?.y,
    })
  }

  const styles = props.error ?
    css`display: none` :
    css`
      ${editorCss(props.config)};
      ${props.markdown ? 'white-space: pre-wrap' : ''};
    `

  return (
    <ProseMirror
      editorViewRef={props.editorViewRef}
      className={styles}
      state={props.text}
      onChange={onChange}
      onReconfigure={onReconfigure}
      onInit={onInit} />
  )
}
