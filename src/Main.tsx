import React, {useEffect, useReducer} from 'react'
import {Global} from '@emotion/core'
import styled from '@emotion/styled'
import {rgb} from './styles'
import {background, font, fonts} from './config'
import {State} from '.'
import {save, read} from './store'
import {updateRemote} from './remote'
import {UpdateState, ReducerContext, reducer} from './reducer'
import Editor from './components/Editor'
import StatusLine from './components/StatusLine'
import Notification from './components/Notification'

const Container = styled.div<any>`
  position: relative;
  display: block;
  background: ${props => rgb(background(props.config))};
  width: 100%;
  height: 100%;
  font-family: ${props => font(props.config)};
`

interface Props {
  initialState: State;
}

export default (props: Props) => {
  const [state, dispatch] = useReducer(reducer, props.initialState);

  useEffect(() => {
    dispatch(UpdateState(read()))
  }, [])

  useEffect(() => {
    if (state.loading) return
    save(state)
    updateRemote(state, dispatch)
  }, [state])

  const fontsStyles = Object.entries(fonts)
    .filter(([key, value]) => value.src)
    .map(([key, value]) => ({
      '@font-face': {
        'fontFamily': `'${value.label}'`,
        'src': `url('${value.src}')`,
      }
    }))

  return (
    <ReducerContext.Provider value={dispatch}>
      <Global styles={fontsStyles} />
      <Container config={state.config}>
        <Editor
          text={state.text}
          files={state.files}
          config={state.config}
          lastModified={state.lastModified} />
        <StatusLine
          text={state.text}
          lastModified={state.lastModified}
          config={state.config} />
        {state.notification ? <Notification notification={state.notification} /> : ''}
      </Container>
    </ReducerContext.Provider>
  )
}
