import React from 'react'
import styled from '@emotion/styled'
import {Error} from '..'
import {Clean, useDispatch} from '../reducer'
import {rgb, rgba} from '../styles'
import {background, color} from '../config'
import {ButtonPrimary} from './Button'

interface Props {
  error: Error;
}

const Layer = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${props => rgb(background(props.theme))};
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 50px;
`

const Container = styled.div`
  max-width: 800px;
  width: 100%;
`

const Pre = styled.pre`
  white-space: pre-wrap;
  word-wrap: break-word;
  background: ${props => rgba(color(props.theme), 0.1)};
  border: 1px solid ${props => rgb(color(props.theme))};
  border-radius: 2px;
  padding: 10px;
`

export default (props: Props) =>
  props.error.id === 'invalid_state' ? invalidState('Invalid State', props.error.props) :
  props.error.id === 'invalid_config' ? invalidState('Invalid Config', props.error.props) :
  props.error.id === 'invalid_file' ? invalidState('Invalid File', props.error.props) :
  null

const invalidState = (title: string, props: unknown) => {
  const dispatch = useDispatch()
  const onClick = () => dispatch(Clean)

  return (
    <Layer>
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
  )
}
