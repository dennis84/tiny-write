import React, {useReducer, useRef} from 'react'
import {EditorView} from 'prosemirror-view'
import {injectGlobal} from '@emotion/css'
import {State} from '.'
import {ReducerContext, UpdateError, reducer} from './reducer'
import {fonts} from './config'
import {ErrorBoundary} from './ErrorBoundary'
import Container from './components/Container'

const fontsStyles = Object.entries(fonts)
  .filter(([, value]) => value.src)
  .map(([, value]) => ({
    '@font-face': {
      fontFamily: `'${value.label}'`,
      src: `url('${value.src}')`,
    },
  }))

injectGlobal(fontsStyles)

export default (props: {state: State}) => {
  const [state, dispatch] = useReducer(reducer, props.state)
  const editorViewRef = useRef<EditorView>()

  return (
    <ReducerContext.Provider value={dispatch}>
      <ErrorBoundary onError={(error) => dispatch(UpdateError(error))}>
        <Container state={state} editorViewRef={editorViewRef} />
      </ErrorBoundary>
    </ReducerContext.Provider>
  )
}
