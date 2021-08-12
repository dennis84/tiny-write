import React, {useReducer, useRef} from 'react'
import {EditorView} from 'prosemirror-view'
import {Global, ThemeProvider} from '@emotion/react'
import {State} from '.'
import {UpdateError, ReducerContext, reducer} from './reducer'
import {fonts} from './config'
import {ErrorBoundary} from './ErrorBoundary'
import ErrorView from './components/Error'
import Container from './components/Container'
import {Layout} from './components/Layout'

export default (props: {state: State}) => {
  const [state, dispatch] = useReducer(reducer, props.state)
  const editorViewRef = useRef<EditorView>()

  const fontsStyles = Object.entries(fonts)
    .filter(([, value]) => value.src)
    .map(([, value]) => ({
      '@font-face': {
        fontFamily: `'${value.label}'`,
        src: `url('${value.src}')`,
      },
    }))

  return (
    <ReducerContext.Provider value={dispatch}>
      <ThemeProvider theme={state.config}>
        <Global styles={fontsStyles} />
        <ErrorBoundary
          onError={(error) => {
            dispatch(UpdateError(error))
            editorViewRef.current = undefined
          }}
          fallback={(error) =>
            <Layout data-testid="error"><ErrorView error={error} /></Layout>
          }
        >
          <Container state={state} editorViewRef={editorViewRef} />
        </ErrorBoundary>
      </ThemeProvider>
    </ReducerContext.Provider>
  )
}
