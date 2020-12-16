import React, {ReactNode} from 'react'
import {EditorState} from 'prosemirror-state'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import {State} from '..'
import {mod} from './env'
import db from './db'
import {Dispatch, New, Discard, UpdateState, UpdateError} from './reducer'
import {isEmpty} from './components/ProseMirror'
import {createState, createEmptyState} from './prosemirror';

const isText = (x: any) => x && x.doc

const isState = (x: any) =>
  x.lastModified instanceof Date &&
  Array.isArray(x.files)

const isFile = (x: any): boolean => x.text && x.lastModified

const isConfig = (x: any): boolean =>
  typeof x.theme === 'string' &&
  typeof x.codeTheme === 'string' &&
  typeof x.font === 'string'

interface Props {
  children: (editorState: EditorState) => ReactNode;
  dispatch: Dispatch;
  state: State;
}

export class WithEditorState extends React.Component<Props> {
  keymap: any

  constructor(props) {
    super(props)
    this.keymap = {
      [`${mod}-n`]: this.onNew.bind(this),
      [`${mod}-w`]: this.onDiscard.bind(this),
    }
  }

  onNew() {
    const {dispatch} = this.props
    dispatch(New)
    return true
  }

  onDiscard(editorState, editorDispatch, editorView) {
    const {dispatch, state} = this.props
    if (state.files.length > 0 && isEmpty(state.text)) {
      dispatch(Discard)
    } else {
      selectAll(editorView.state, editorView.dispatch)
      deleteSelection(editorView.state, editorView.dispatch)
    }

    return true
  }

  componentDidMount() {
    const {dispatch, state} = this.props

    db.get('state').then((data) => {
      let parsed
      try {
        parsed = JSON.parse(data)
      } catch (err) { /* ignore */ }

      if (!parsed) {
        dispatch(UpdateState({...state, loading: false}))
        return
      }

      const config = {...state.config, ...parsed.config}
      if (!isConfig(config)) {
        dispatch(UpdateError({id: 'invalid_config', props: config}))
        return
      }

      let text
      if (parsed.text) {
        if (!isText(parsed.text)) {
          dispatch(UpdateError({id: 'invalid_state', props: parsed.text}))
          return
        }

        try {
          text = createState({data: parsed.text, keymap: this.keymap})
        } catch (err) {
          dispatch(UpdateError({id: 'invalid_file', props: parsed.text}))
          return
        }
      }

      const newState = {
        ...state,
        ...parsed,
        text,
        config,
        loading: false,
      }

      if (parsed.lastModified) {
        newState.lastModified = new Date(parsed.lastModified)
      }

      if (parsed.lastModified) {
        newState.lastModified = new Date(parsed.lastModified)
      }

      if (parsed.files) {
        for (const file of parsed.files) {
          if (!isFile(file)) {
            dispatch(UpdateError({id: 'invalid_file', props: file}))
          }
        }
      }

      if (!isState(newState)) {
        dispatch(UpdateError({id: 'invalid_state', props: newState}))
        return
      }

      dispatch(UpdateState(newState))
    })
  }

  render() {
    return this.props.children(this.props.state.text ?? createEmptyState({
      keymap: this.keymap
    }))
  }
}
