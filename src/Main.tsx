import React, {useEffect, useReducer} from 'react'
import {Global, ThemeProvider} from '@emotion/react'
import styled from '@emotion/styled'
import {rgb} from './styles'
import {background, color, font, fonts} from './config'
import {newState} from '.'
import * as remote from './remote'
import db from './db'
import {useDebouncedEffect, usePrevious} from './hooks'
import {ReducerContext, reducer} from './reducer'
import {ErrorBoundary} from './ErrorBoundary'
import {WithEditorState} from './WithEditorState'
import Editor from './components/Editor'
import Error from './components/Error'
import Menu from './components/Menu'
import {ProseMirrorProvider} from './components/ProseMirror'

const Container = styled.div`
  position: relative;
  display: flex;
  background: ${(props) => rgb(background(props.theme))};
  width: 100%;
  height: 100%;
  font-family: ${(props) => font(props.theme)};
  font-size: 18px;
  color: ${(props) => rgb(color(props.theme))};
`

export default () => {
  const initialState = newState()
  const [state, dispatch] = useReducer(reducer, initialState)
  const loadingPrev = usePrevious(state.loading)

  useEffect(() => {
    remote.setAlwaysOnTop(state.alwaysOnTop);
  }, [state.alwaysOnTop])

  useDebouncedEffect(() => {
    if (loadingPrev !== false) {
      return
    }

    db.set('state', JSON.stringify(state))
  }, 100, [state.lastModified])

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
        <ErrorBoundary fallback={(error) => <Error error={error} />}>
          <Container>
            {state.error ? (
              <Error error={state.error} />
            ) : (
              <ProseMirrorProvider>
                <WithEditorState state={state} dispatch={dispatch}>
                  {editorState => (
                    <Editor
                      text={editorState}
                      lastModified={state.lastModified}
                      files={state.files}
                      config={state.config}
                      focusMode={state.focusMode} />
                  )}
                </WithEditorState>
                <Menu
                  text={state.text}
                  lastModified={state.lastModified}
                  files={state.files}
                  config={state.config}
                  alwaysOnTop={state.alwaysOnTop}
                  focusMode={state.focusMode} />
              </ProseMirrorProvider>
            )}
          </Container>
        </ErrorBoundary>
      </ThemeProvider>
    </ReducerContext.Provider>
  )
}
