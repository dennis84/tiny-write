import {onMount} from 'solid-js'
import {css} from '@emotion/css'
import {useState} from '../state'
import {editorCss} from './Layout'

export default () => {
  const [store, ctrl] = useState()
  let editorRef: HTMLDivElement

  onMount(() => {
    ctrl.createEditorView(editorRef)
  })

  const styles = () => store.error ?
    css`display: none` :
    css`
      ${editorCss(store.config)};
      ${store.markdown ? 'white-space: pre-wrap' : ''};
    `

  return (
    <div
      ref={editorRef}
      class={styles()}
      spellcheck={false}
      data-tauri-drag-region="true"
    />
  )
}
