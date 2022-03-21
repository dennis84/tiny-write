import {css} from '@emotion/css'
import {EditorView} from 'prosemirror-view'
import {EditorState} from 'prosemirror-state'
import {useState} from '../state'
import {ProseMirror} from '../prosemirror/editor'
import {editorCss} from './Layout'

export default () => {
  const [store, ctrl] = useState()

  const onInit = (text: EditorState, editorView: EditorView) => {
    ctrl.setState({editorView, text})
  }

  const onReconfigure = (text: EditorState) => {
    ctrl.setState({text})
  }

  const onChange = (text: EditorState) => {
    ctrl.setState({text, lastModified: new Date()})
  }

  const styles = () => store.error ?
    css`display: none` :
    css`
      ${editorCss(store.config)};
      ${store.markdown ? 'white-space: pre-wrap' : ''};
    `

  return (
    <ProseMirror
      className={styles()}
      editorView={store.editorView}
      text={store.text}
      extensions={store.extensions}
      onInit={onInit}
      onReconfigure={onReconfigure}
      onChange={onChange} />
  )
}
