import React, {useEffect, useReducer} from 'react'
import {Global} from '@emotion/core'
import styled from '@emotion/styled'
import {ThemeProvider} from 'emotion-theming'
import {rgb} from './styles'
import {background, font, fonts} from './config'
import {State} from '.'
import db from './db'
import {updateRemote} from './remote'
import {Load, ReducerContext, reducer} from './reducer'
import {usePrevious} from './use-previous'
import Editor from './components/Editor'
import StatusLine from './components/StatusLine'
import Notification from './components/Notification'

const Container = styled.div<any>`
  position: relative;
  display: block;
  background: ${props => rgb(background(props.theme))};
  width: 100%;
  height: 100%;
  font-family: ${props => font(props.theme)};
`

interface Props {
  initialState: State;
}

export default (props: Props) => {
  const [state, dispatch] = useReducer(reducer, props.initialState)
  const loadingPrev = usePrevious(state.loading)

  useEffect(() => {
    db.get('state').then((data) => {
      dispatch(Load(data))
    })
  }, [])

  useEffect(() => {
    if (loadingPrev !== false) {
      return
    }

    db.set('state', JSON.stringify(state)).then(() => {
      updateRemote(state, dispatch)
    })
  }, [state.lastModified])

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
      <ThemeProvider theme={state.config}>
        <Global styles={fontsStyles} />
        <Container>
          <Editor
            text={state.text}
            lastModified={state.lastModified}
            files={state.files}
            config={state.config}
            loading={state.loading} />
          <StatusLine
            text={state.text}
            lastModified={state.lastModified} />
          {state.notification && (
            <Notification notification={state.notification} />
          )}
        </Container>
      </ThemeProvider>
    </ReducerContext.Provider>
  )
}
