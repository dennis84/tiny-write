import React from 'react'
import styled from '@emotion/styled'
import {ErrorObject} from '..'
import {Clean, Discard, UpdateError, UpdateLoading, useDispatch} from '../reducer'
import {foreground} from '../config'
import {ButtonPrimary} from './Button'
import {ErrorLayout} from './Layout'

interface Props {
  error: ErrorObject;
}

const Layer = styled.div`
  width: 100%;
  overflow: y-auto;
  padding: 50px;
  display: flex;
  justify-content: center;
  ::-webkit-scrollbar {
    display: none;
  }
`

const Container = styled.div`
  max-width: 800px;
  width: 100%;
  height: fit-content;
`

const Pre = styled.pre`
  white-space: pre-wrap;
  word-wrap: break-word;
  background: ${props => foreground(props.theme)}19;
  border: 1px solid ${props => foreground(props.theme)};
  border-radius: 2px;
  padding: 10px;
`

export default (props: Props) =>
  props.error.id === 'invalid_state' ? invalidState('Invalid State', props.error.props) :
  props.error.id === 'invalid_config' ? invalidState('Invalid Config', props.error.props) :
  props.error.id === 'invalid_file' ? invalidState('Invalid File', props.error.props) :
  other(props)

const invalidState = (title: string, props: unknown) => {
  const dispatch = useDispatch()
  const onClick = () => dispatch(Clean)

  return (
    <ErrorLayout data-testid="error">
      <Layer data-tauri-drag-region="true">
        <Container>
          <h1>{title}</h1>
          <p>
            There is an error with the editor state. This is probably due to an
            old version in which the data structure has changed. Automatic data
            migrations may be supported in the future. To fix this now, you can
            copy important notes from below, clean the state and paste it again.
          </p>
          <Pre>
            <code>{JSON.stringify(props)}</code>
          </Pre>
          <ButtonPrimary onClick={onClick}>Clean</ButtonPrimary>
        </Container>
      </Layer>
    </ErrorLayout>
  )
}

const other = (props: Props) => {
  const dispatch = useDispatch()
  const onClick = () => {
    dispatch(UpdateError(undefined))
    dispatch(Discard)
    dispatch(UpdateLoading('initialized'))
  }

  const getMessage = () => {
    const err = (props.error.props as any).error
    return (typeof err === 'string') ? err : err.message
  }

  return (
    <ErrorLayout data-testid="error">
      <Layer data-tauri-drag-region="true">
        <Container>
          <h1>An error occurred.</h1>
          <Pre><code>{getMessage()}</code></Pre>
          <ButtonPrimary onClick={onClick}>Close</ButtonPrimary>
        </Container>
      </Layer>
    </ErrorLayout>
  )
}
