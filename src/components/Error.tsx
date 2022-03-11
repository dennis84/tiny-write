import React from 'react'
import {css} from '@emotion/css'
import {ErrorObject} from '..'
import {Clean, Discard, useDispatch} from '../reducer'
import {foreground} from '../config'
import {Config} from '..'
import {buttonPrimary} from './Button'

interface Props {
  error: ErrorObject;
  config: Config;
}

const layer = css`
  width: 100%;
  overflow: y-auto;
  padding: 50px;
  display: flex;
  font-family: 'JetBrains Mono';
  justify-content: center;
  ::-webkit-scrollbar {
    display: none;
  }
`

const container = css`
  max-width: 800px;
  width: 100%;
  height: fit-content;
`

const pre = (config: Config) => css`
  white-space: pre-wrap;
  word-wrap: break-word;
  background: ${foreground(config)}19;
  border: 1px solid ${foreground(config)};
  border-radius: 2px;
  padding: 10px;
`

export default (props: Props) =>
  props.error.id === 'invalid_state' ? invalidState('Invalid State', props) :
  props.error.id === 'invalid_config' ? invalidState('Invalid Config', props) :
  props.error.id === 'invalid_file' ? invalidState('Invalid File', props) :
  other(props)

const invalidState = (title: string, props: Props) => {
  const dispatch = useDispatch()
  const onClick = () => dispatch(Clean)

  return (
    <div className={layer} data-tauri-drag-region="true">
      <div className={container}>
        <h1>{title}</h1>
        <p>
          There is an error with the editor state. This is probably due to an
          old version in which the data structure has changed. Automatic data
          migrations may be supported in the future. To fix this now, you can
          copy important notes from below, clean the state and paste it again.
        </p>
        <pre className={pre(props.config)}>
          <code>{JSON.stringify(props.error.props)}</code>
        </pre>
        <button className={buttonPrimary(props.config)} onClick={onClick}>Clean</button>
      </div>
    </div>
  )
}

const other = (props: Props) => {
  const dispatch = useDispatch()
  const onClick = () => {
    dispatch(Discard)
  }

  const getMessage = () => {
    const err = (props.error.props as any).error
    return (typeof err === 'string') ? err : err.message
  }

  return (
    <div className={layer} data-tauri-drag-region="true">
      <div className={container}>
        <h1>An error occurred.</h1>
        <pre className={pre(props.config)}><code>{getMessage()}</code></pre>
        <button className={buttonPrimary(props.config)} onClick={onClick}>Close</button>
      </div>
    </div>
  )
}
